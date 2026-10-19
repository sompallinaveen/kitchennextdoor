import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function KitchenIllustrationFallback() {
  return (
    <svg className="kitchen-scene-fallback" viewBox="0 0 500 430" role="img" aria-label="A warm little kitchen house with a bowl of food">
      <ellipse cx="250" cy="375" rx="165" ry="27" fill="#eadcc8" />
      <path d="M113 190 250 74l137 116v159H113z" fill="#fffdf8" />
      <path d="M87 194 250 57l163 137-20 23L250 94 107 217z" fill="#e86024" />
      <path d="M150 223h66v126h-66z" fill="#f1b77e" />
      <path d="M237 220h89v74h-89z" fill="#d8eee8" stroke="#15803d" strokeWidth="8" />
      <path d="M281 220v74m-44-37h89" stroke="#15803d" strokeWidth="6" />
      <path d="M331 275c-20 10-27 31-24 55h87c3-24-4-45-24-55z" fill="#e86024" />
      <ellipse cx="350" cy="275" rx="31" ry="10" fill="#f9c98f" />
      <path d="M334 256c-9-16 9-18 0-35m20 35c-9-17 10-20 1-39" fill="none" stroke="#e6a75e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="167" cy="257" r="5" fill="#6d452b" />
    </svg>
  );
}

function makeMaterial(color, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export default function KitchenScene() {
  const containerRef = useRef(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch (error) {
      console.warn("3D kitchen illustration is unavailable; using its static fallback.", error);
      setUnsupported(true);
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0.5, 2.8, 8.5);
    camera.lookAt(0, 1.3, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff7eb, 0x9d7d5d, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(-4, 7, 6);
    scene.add(keyLight);

    const cream = makeMaterial("#FAF7F2");
    const orange = makeMaterial("#E86024");
    const green = makeMaterial("#15803D");
    const wood = makeMaterial("#C98B57");
    const glass = new THREE.MeshStandardMaterial({ color: "#cce9e1", roughness: 0.28, metalness: 0.05 });
    const group = new THREE.Group();
    scene.add(group);
    const geometricFallback = new THREE.Group();
    group.add(geometricFallback);

    const addBox = (geometry, material, position, rotation = null) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      if (rotation) mesh.rotation.set(...rotation);
      geometricFallback.add(mesh);
      return mesh;
    };

    addBox(new THREE.BoxGeometry(2.7, 1.8, 2.05), cream, [0, 1.05, 0]);
    addBox(new THREE.BoxGeometry(1.85, 0.16, 2.35), orange, [-0.55, 2.38, 0], [0, 0, 0.63]);
    addBox(new THREE.BoxGeometry(1.85, 0.16, 2.35), orange, [0.55, 2.38, 0], [0, 0, -0.63]);
    addBox(new THREE.BoxGeometry(0.36, 0.9, 0.42), wood, [-0.78, 2.65, -0.65]);

    addBox(new THREE.BoxGeometry(0.55, 1.12, 0.09), wood, [-0.66, 0.68, 1.08]);
    const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), orange);
    doorKnob.position.set(-0.46, 0.68, 1.145);
    group.add(doorKnob);
    addBox(new THREE.BoxGeometry(0.86, 0.7, 0.1), green, [0.54, 1.21, 1.08]);
    addBox(new THREE.BoxGeometry(0.72, 0.56, 0.04), glass, [0.54, 1.21, 1.14]);
    addBox(new THREE.BoxGeometry(0.055, 0.62, 0.04), green, [0.54, 1.21, 1.18]);
    addBox(new THREE.BoxGeometry(0.78, 0.055, 0.04), green, [0.54, 1.21, 1.18]);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.65, 48),
      new THREE.MeshBasicMaterial({ color: "#eadcc8", transparent: true, opacity: 0.68 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.03;
    geometricFallback.add(ground);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.44, 0.3, 40, 1, true), orange);
    bowl.position.set(1.58, 0.48, 1.35);
    geometricFallback.add(bowl);
    const bowlInside = new THREE.Mesh(new THREE.CircleGeometry(0.56, 40), makeMaterial("#f7c47f", 0.48));
    bowlInside.rotation.x = -Math.PI / 2;
    bowlInside.position.set(1.58, 0.64, 1.35);
    geometricFallback.add(bowlInside);
    const meal = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), makeMaterial("#15803D", 0.58));
    meal.scale.set(1.3, 0.35, 0.8);
    meal.position.set(1.58, 0.7, 1.35);
    geometricFallback.add(meal);

    const stars = [];
    for (const [x, y, z, size] of [[-2, 2.7, 0.6, 0.08], [1.9, 2.8, 0, 0.06], [-1.9, 1, 1.9, 0.05]]) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), makeMaterial("#eaa04d", 0.45));
      star.position.set(x, y, z);
      star.userData.baseY = y;
      geometricFallback.add(star);
      stars.push(star);
    }

    let disposed = false;
    let heroTexture = null;
    new THREE.TextureLoader().load(
      "/hero-house.png",
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        heroTexture = texture;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const heroImage = new THREE.Mesh(
          new THREE.PlaneGeometry(4.8, 4.8),
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        heroImage.position.set(0, 1.35, 0.15);
        group.add(heroImage);
        geometricFallback.visible = false;
      },
      undefined,
      (error) => {
        console.warn("The 3D hero image could not be loaded; using the geometric kitchen fallback.", error);
      },
    );

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event) => {
      const bounds = container.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (reducedMotion) renderer.render(scene, camera);
    });
    resizeObserver.observe(container);
    container.addEventListener("pointermove", onPointerMove, { passive: true });

    let animationFrame = 0;
    const startedAt = performance.now();
    const render = (now) => {
      const elapsed = (now - startedAt) / 1000;
      if (!reducedMotion) {
        group.position.y = Math.sin(elapsed * 1.15) * 0.055;
        group.rotation.y += (pointer.x * 0.12 + Math.sin(elapsed * 0.28) * 0.04 - group.rotation.y) * 0.025;
        group.rotation.x += (-pointer.y * 0.045 - group.rotation.x) * 0.025;
        stars.forEach((star, index) => {
          star.position.y = star.userData.baseY + Math.sin(elapsed * 1.6 + index) * 0.045;
        });
      }
      renderer.render(scene, camera);
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
    };
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      group.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      heroTexture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="kitchen-scene"
      role="img"
      aria-label="A cozy three-dimensional home kitchen with a bowl of fresh food"
    >
      {unsupported && <KitchenIllustrationFallback />}
    </div>
  );
}
