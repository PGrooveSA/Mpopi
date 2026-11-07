"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import type { BodyType } from "@/lib/fit";
import { buildBody, buildShirt, loft, tube, ringPerimeter, type BodyModel, type ShirtModel, type ShirtParams } from "./geometry";

export interface SceneProps {
  body: { type: BodyType; chest: number; height: number; skin: string };
  shirt: ShirtParams & { hex: string; print?: string; printBack?: string; printScale: number; printOffsetY: number; backPrintScale: number };
  rotation: MutableRefObject<number>;
  autoRotate: boolean;
  /** Ghost-mannequin product view: only the tee, no body */
  ghost?: boolean;
}

const PANTS = "#ece6de";

function useImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    let alive = true;
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => alive && setImg(i);
    i.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return img;
}

let noiseTile: HTMLCanvasElement | null = null;
function getNoise() {
  if (noiseTile) return noiseTile;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const d = ctx.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 14;
  }
  ctx.putImageData(d, 0, 0);
  noiseTile = c;
  return c;
}

/** Paints shirt colour, fabric grain and the front/back prints into one texture wrapped around the shirt. */
function useShirtTexture(shirt: SceneProps["shirt"], model: ShirtModel, body: BodyModel) {
  const front = useImage(shirt.print);
  const back = useImage(shirt.printBack);
  const texture = useMemo(() => {
    const W = 2048;
    const H = 1024;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = shirt.hex;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = ctx.createPattern(getNoise(), "repeat")!;
    ctx.fillRect(0, 0, W, H);

    const range = model.topY - model.hemY;
    const perim = ringPerimeter(model.chestRing);
    const flatHalf = shirt.chest / 200; // flat width of the garment in metres
    const unit = flatHalf / 260; // mockup units → metres
    const draw = (img: HTMLImageElement, scale: number, topUnits: number, centerU: number) => {
      const wM = flatHalf * scale * 0.8; // a flat print wraps around the body, so it reads narrower in 3D
      const hM = (wM * img.height) / img.width;
      const topY = body.neckY - topUnits * unit;
      const pxW = (wM / perim) * W;
      const pxH = (hM / range) * H;
      const y = (1 - (topY - model.hemY) / range) * H;
      for (const cu of centerU === 0 ? [0, 1] : [centerU]) {
        ctx.drawImage(img, cu * W - pxW / 2, y, pxW, pxH);
      }
    };
    if (front) draw(front, shirt.printScale, 72 + shirt.printOffsetY * 0.75, 0.5);
    if (back) draw(back, shirt.backPrintScale, 58, 0);

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [front, back, shirt.hex, shirt.chest, shirt.printScale, shirt.printOffsetY, shirt.backPrintScale, model, body]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Arm({ body, side, skin }: { body: BodyModel; side: 1 | -1; skin: THREE.Material }) {
  const geo = useMemo(() => {
    const r = body.armR;
    const u = body.upperArm;
    const f = body.foreArm;
    return tube(
      [
        { y: 0.03, r: r * 0.7 },
        { y: 0, r: r * 1.0 },
        { y: -u * 0.35, r: r * 0.98 },
        { y: -u, r: r * 0.74 },
        { y: -u - f * 0.3, r: r * 0.76 },
        { y: -u - f, r: r * 0.52 },
      ],
      { capTop: true, capBottom: true },
    );
  }, [body]);
  const hand = body.armR * 0.62;
  return (
    <group position={[body.armRoot.x * side, body.armRoot.y, body.armRoot.z]} rotation={[0.04, 0, body.armAngle * side]}>
      <mesh geometry={geo} material={skin} castShadow />
      <mesh material={skin} position={[0, -body.upperArm - body.foreArm - hand * 1.2, 0.005]} scale={[hand * 0.75, hand * 1.75, hand * 1.15]}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
    </group>
  );
}

function Sleeve({ body, shirt, side, material }: { body: BodyModel; shirt: ShirtModel; side: 1 | -1; material: THREE.Material }) {
  const geo = useMemo(
    () =>
      tube(
        [
          { y: 0.045, r: shirt.sleeveTop * 0.72 },
          { y: 0.015, r: shirt.sleeveTop },
          { y: -shirt.sleeveLen * 0.45, r: (shirt.sleeveTop + shirt.sleeveEnd) / 2 },
          { y: -shirt.sleeveLen, r: shirt.sleeveEnd },
        ],
        { capTop: true, seg: 48 },
      ),
    [shirt],
  );
  const hem = useMemo(() => new THREE.TorusGeometry(1, 0.06, 8, 48), []);
  return (
    <group position={[body.armRoot.x * side, body.armRoot.y + 0.004, body.armRoot.z]} rotation={[0.04, 0, shirt.sleeveAngle * side]}>
      <mesh geometry={geo} material={material} castShadow />
      <mesh geometry={hem} material={material} position={[0, -shirt.sleeveLen, 0]} rotation={[Math.PI / 2, 0, 0]} scale={shirt.sleeveEnd} />
    </group>
  );
}

function Mannequin({ body: b, shirt: s, rotation, autoRotate, ghost }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const body = useMemo(() => buildBody({ type: b.type, chest: b.chest, height: b.height }), [b.type, b.chest, b.height]);
  const model = useMemo(() => buildShirt(body, b.chest, s, b.type), [body, b.chest, b.type, s]);
  const texture = useShirtTexture(s, model, body);

  const skin = useMemo(() => new THREE.MeshPhysicalMaterial({ color: b.skin, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.6, sheen: 0.3 }), [b.skin]);
  const pants = useMemo(() => new THREE.MeshStandardMaterial({ color: PANTS, roughness: 0.95 }), []);
  const shoes = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 }), []);
  const fabric = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: texture,
        roughness: 0.86,
        sheen: 0.7,
        sheenRoughness: 0.65,
        sheenColor: new THREE.Color("#ffffff"),
        side: THREE.FrontSide,
      }),
    [texture],
  );
  // inside of the tee (seen through the neck and hem) is a little darker, like a ghost-mannequin photo
  const innerFabric = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(s.hex).multiplyScalar(0.72), roughness: 0.95, side: THREE.BackSide }),
    [s.hex],
  );
  const sleeveFabric = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: s.hex, roughness: 0.86, sheen: 0.7, sheenRoughness: 0.65, sheenColor: new THREE.Color("#fff"), side: THREE.DoubleSide }),
    [s.hex],
  );
  useEffect(() => () => [skin, pants, shoes, fabric, sleeveFabric, innerFabric].forEach((m) => m.dispose()), [skin, pants, shoes, fabric, sleeveFabric, innerFabric]);

  const torsoGeo = useMemo(() => loft(body.torso.filter((r) => r.y > 0.9 * body.hs), { capTop: true }), [body]);
  const hipsGeo = useMemo(
    () =>
      loft(
        body.torso
          .filter((r) => r.y <= 1.0 * body.hs)
          .map((r) => ({ ...r, a: r.a + 0.004, bf: r.bf + 0.004, bb: r.bb + 0.004 })),
        { capBottom: true },
      ),
    [body],
  );
  const legGeo = useMemo(() => {
    const h = body.hs;
    const w = body.wf;
    return tube(
      [
        { y: 0.84 * h, r: 0.098 * w },
        { y: 0.72 * h, r: 0.088 * w },
        { y: 0.52 * h, r: 0.07 * w },
        { y: 0.44 * h, r: 0.064 * w },
        { y: 0.24 * h, r: 0.06 * w },
        { y: 0.09 * h, r: 0.057 * w },
        { y: 0.06 * h, r: 0.058 * w },
      ],
      { capBottom: true },
    );
  }, [body]);
  const shirtGeo = useMemo(
    () =>
      loft(model.rings, {
        seg: 120,
        wobble: (t, r) => {
          // soft drape folds below the chest, stronger when the shirt is loose
          const below = THREE.MathUtils.clamp((body.chestY - r.y) / (body.chestY - model.hemY), 0, 1);
          const amp = (0.004 + model.looseness * 0.018) * below;
          return 1 + amp * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 7 + r.y * 9)) + amp * 0.6 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 3 + 1.3));
        },
      }),
    [model, body],
  );
  const collarGeo = useMemo(() => new THREE.TorusGeometry(1, 0.075, 10, 64), []);
  const hemGeo = useMemo(() => new THREE.TorusGeometry(1, 0.02, 6, 96), []);
  useEffect(
    () => () => [torsoGeo, hipsGeo, legGeo, shirtGeo, collarGeo, hemGeo].forEach((g) => g.dispose()),
    [torsoGeo, hipsGeo, legGeo, shirtGeo, collarGeo, hemGeo],
  );

  const hem = model.rings[0];
  const headY = body.neckY + 0.185 * body.hs;
  const headScale = b.type === "female" ? 0.93 : 1;

  useFrame((_, dt) => {
    if (autoRotate) rotation.current += dt * 0.6;
    const g = group.current;
    if (g) g.rotation.y = THREE.MathUtils.damp(g.rotation.y, rotation.current, 8, dt);
  });

  return (
    <group ref={group}>
      {!ghost && (
        <>
      {/* body */}
      <mesh geometry={torsoGeo} material={skin} castShadow />
      <mesh material={skin} position={[0, body.neckY + 0.05 * body.hs, -0.005]} castShadow>
        <cylinderGeometry args={[0.05 * Math.sqrt(body.wf), 0.056 * Math.sqrt(body.wf), 0.12 * body.hs, 32]} />
      </mesh>
      <mesh material={skin} position={[0, headY, 0.004]} scale={[0.083 * headScale, 0.112 * headScale, 0.098 * headScale]} castShadow>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      <Arm body={body} side={1} skin={skin} />
      <Arm body={body} side={-1} skin={skin} />
      {/* bottoms */}
      <mesh geometry={hipsGeo} material={pants} />
      <mesh geometry={legGeo} material={pants} position={[body.legX, 0, 0]} castShadow />
      <mesh geometry={legGeo} material={pants} position={[-body.legX, 0, 0]} castShadow />
      {[1, -1].map((side) => (
        <mesh key={side} material={shoes} position={[body.legX * side, 0.035, 0.035]} scale={[0.055 * body.wf, 0.042, 0.125 * body.hs]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
      ))}
        </>
      )}
      {/* t-shirt */}
      <mesh geometry={shirtGeo} material={fabric} castShadow />
      <mesh geometry={shirtGeo} material={innerFabric} />
      <mesh geometry={hemGeo} material={sleeveFabric} position={[0, hem.y + 0.004, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[hem.a, (hem.bf + hem.bb) / 2, hem.a]} />
      <mesh
        geometry={collarGeo}
        material={sleeveFabric}
        position={[0, model.collar.y + 0.002, (model.collar.bf - model.collar.bb) / 2]}
        rotation={[Math.PI / 2 + 0.12, 0, 0]}
        scale={[model.collar.a * 0.93, (model.collar.bf + model.collar.bb) / 2 * 0.93, model.collar.a]}
      />
      <Sleeve body={body} shirt={model} side={1} material={sleeveFabric} />
      <Sleeve body={body} shirt={model} side={-1} material={sleeveFabric} />
    </group>
  );
}

export default function Scene(props: SceneProps) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: props.ghost ? [0, 1.12, 1.95] : [0, 1.2, 2.55], fov: 32 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => (gl.toneMappingExposure = 1.3)}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.7} color="#ffd6e6" />
      <directionalLight position={[0, 1.5, -3]} intensity={0.5} color="#cfe0ff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 3, 2]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffc2d8" position={[-3, 1.5, 0]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#c8dcff" position={[3, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="ring" intensity={0.8} position={[0, 1, -3]} scale={2} />
      </Environment>
      <Mannequin {...props} />
      <ContactShadows position={[0, props.ghost ? 0.5 : 0, 0]} opacity={props.ghost ? 0.3 : 0.45} scale={props.ghost ? 1.6 : 3} blur={props.ghost ? 3 : 2.4} far={props.ghost ? 0.5 : 1.2} color="#2a2526" />
      <OrbitControls
        target={props.ghost ? [0, 1.06, 0] : [0, 1.1, 0]}
        enableRotate={false}
        enablePan={false}
        enableZoom
        minDistance={props.ghost ? 1 : 1.1}
        maxDistance={props.ghost ? 3 : 4}
        zoomSpeed={0.6}
      />
    </Canvas>
  );
}
