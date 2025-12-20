"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GeoJSONWorldData } from "@/types/geoJson";
import { useEffect, useRef, useState } from "react";

interface GlobeProps {
  locations?: Array<{
    lat: number;
    lng: number;
    ip: string;
    city: string | null;
    country: string | null;
    nodeCount: number;
    lastSeen: string;
    pubkeys?: string[];
  }>;
  height?: string;
}

interface TooltipState {
  ip: string;
  city: string | null;
  country: string | null;
  nodeCount: number;
  x: number;
  y: number;
}

function GlobeScene({
  locations,
  setHoveredNode,
}: {
  locations?: GlobeProps["locations"];
  setHoveredNode: React.Dispatch<React.SetStateAction<TooltipState | null>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [geoData, setGeoData] = useState<GeoJSONWorldData | null>(null);

  useEffect(() => {
    fetch("/world.geojson")
      .then((response) => response.json())
      .then((data: GeoJSONWorldData) => setGeoData(data))
      .catch((error) => console.error("Error loading GeoJSON:", error));
  }, []);

  const convertToSphereCoordinates = (lon: number, lat: number, radius = 2) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return {
      x: -radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    };
  };

  const createCountryLines = () => {
    if (!geoData) return null;

    const lines: React.ReactElement[] = [];

    geoData.features.forEach((feature, featureIndex) => {
      const { geometry } = feature;
      let coordinateArrays: number[][][] = [];

      if (geometry.type === "Polygon") {
        coordinateArrays = geometry.coordinates as number[][][];
      } else if (geometry.type === "MultiPolygon") {
        const multiPolygon = geometry.coordinates as number[][][][];
        coordinateArrays = multiPolygon.flat();
      }

      coordinateArrays.forEach((ring, ringIndex) => {
        const points: THREE.Vector3[] = [];

        ring.forEach(([lon, lat]) => {
          const sphereCoords = convertToSphereCoordinates(lon, lat);
          points.push(
            new THREE.Vector3(sphereCoords.x, sphereCoords.y, sphereCoords.z),
          );
        });

        if (points.length > 1) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          lines.push(
            <primitive
              key={`${featureIndex}-${ringIndex}`}
              object={
                new THREE.Line(
                  lineGeometry,
                  new THREE.LineBasicMaterial({
                    color: "#ffffff",
                    transparent: true,
                    opacity: 0.5,
                  }),
                )
              }
            />,
          );
        }
      });
    });

    return lines;
  };

  const createNodeMarkers = () => {
    if (!locations || locations.length === 0) return null;

    return locations.map((location, index) => {
      const sphereCoords = convertToSphereCoordinates(
        location.lng,
        location.lat,
        2.03,
      );

      return (
        <mesh
          key={`marker-${index}`}
          position={[sphereCoords.x, sphereCoords.y, sphereCoords.z]}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
            setHoveredNode({
              ip: location.ip,
              city: location.city,
              country: location.country,
              nodeCount: location.nodeCount,
              x: e.clientX,
              y: e.clientY,
            });
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            setHoveredNode((prev) =>
              prev
                ? {
                    ...prev,
                    x: e.clientX,
                    y: e.clientY,
                  }
                : null,
            );
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "default";
            setHoveredNode(null);
          }}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      );
    });
  };

  const createConnectionLines = () => {
    if (!locations || locations.length < 2) return null;

    const lines: React.ReactElement[] = [];
    const validLocations = locations.filter(
      (loc) => loc.lat !== null && loc.lng !== null,
    );

    if (validLocations.length < 2) return null;

    const drawnConnections = new Set<string>();
    const connectedIPs = new Set<string>();

    // Helper function to create a connection line
    const createConnection = (
      start: (typeof validLocations)[0],
      end: (typeof validLocations)[0],
      key: string,
    ) => {
      if (start.lat === end.lat && start.lng === end.lng) return null;

      const connectionId = [start.ip, end.ip].sort().join("-");
      if (drawnConnections.has(connectionId)) return null;
      drawnConnections.add(connectionId);
      connectedIPs.add(start.ip);
      connectedIPs.add(end.ip);

      const startCoords = convertToSphereCoordinates(
        start.lng,
        start.lat,
        2.02,
      );
      const endCoords = convertToSphereCoordinates(end.lng, end.lat, 2.02);

      const startVec = new THREE.Vector3(
        startCoords.x,
        startCoords.y,
        startCoords.z,
      );
      const endVec = new THREE.Vector3(endCoords.x, endCoords.y, endCoords.z);

      const midPoint = startVec.clone().lerp(endVec, 0.5);
      const distance = startVec.distanceTo(endVec);
      // Increase arc height significantly to ensure lines always curve outside
      const arcHeight = Math.max(2.5, 2 + distance * 0.6);
      midPoint.normalize().multiplyScalar(arcHeight);

      const curve = new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec);
      const points = curve.getPoints(50);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

      return (
        <primitive
          key={key}
          object={
            new THREE.Line(
              lineGeometry,
              new THREE.LineBasicMaterial({
                color: "#22c55e",
                transparent: true,
                opacity: 0.8,
                linewidth: 1,
              }),
            )
          }
        />
      );
    };

    // Step 1: Connect locations by pubkey (same node seen at multiple locations)
    const locationsByPubkey = new Map<string, typeof validLocations>();
    for (const loc of validLocations) {
      for (const pubkey of loc.pubkeys || []) {
        if (!locationsByPubkey.has(pubkey)) {
          locationsByPubkey.set(pubkey, []);
        }
        locationsByPubkey.get(pubkey)!.push(loc);
      }
    }

    for (const [, nodeLocations] of locationsByPubkey) {
      if (nodeLocations.length < 2) continue;

      for (let i = 0; i < nodeLocations.length; i++) {
        for (let j = i + 1; j < nodeLocations.length; j++) {
          const line = createConnection(
            nodeLocations[i],
            nodeLocations[j],
            `pubkey-${nodeLocations[i].ip}-${nodeLocations[j].ip}`,
          );
          if (line) lines.push(line);
        }
      }
    }

    // Step 2: Connect isolated nodes within the same country
    const locationsByCountry = new Map<string, typeof validLocations>();
    for (const loc of validLocations) {
      const country = loc.country || "Unknown";
      if (!locationsByCountry.has(country)) {
        locationsByCountry.set(country, []);
      }
      locationsByCountry.get(country)!.push(loc);
    }

    for (const [, countryLocations] of locationsByCountry) {
      if (countryLocations.length < 2) continue;

      // Find isolated locations in this country
      const isolated = countryLocations.filter(
        (loc) => !connectedIPs.has(loc.ip),
      );
      const connected = countryLocations.filter((loc) =>
        connectedIPs.has(loc.ip),
      );

      // Connect isolated to at least one other location
      for (const isolatedLoc of isolated) {
        // Try to connect to another location in the same country
        const target =
          connected.length > 0
            ? connected[0]
            : countryLocations.find((l) => l.ip !== isolatedLoc.ip);

        if (target) {
          const line = createConnection(
            isolatedLoc,
            target,
            `country-${isolatedLoc.ip}-${target.ip}`,
          );
          if (line) lines.push(line);
        }
      }
    }

    // Step 3: Final fallback - connect any remaining isolated nodes to nearest neighbor
    const stillIsolated = validLocations.filter(
      (loc) => !connectedIPs.has(loc.ip),
    );

    for (const isolatedLoc of stillIsolated) {
      // Find the nearest connected node or any other node
      let nearestNode = null;
      let minDistance = Infinity;

      for (const otherLoc of validLocations) {
        if (otherLoc.ip === isolatedLoc.ip) continue;

        const dist = Math.sqrt(
          Math.pow(isolatedLoc.lat - otherLoc.lat, 2) +
            Math.pow(isolatedLoc.lng - otherLoc.lng, 2),
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestNode = otherLoc;
        }
      }

      if (nearestNode) {
        const line = createConnection(
          isolatedLoc,
          nearestNode,
          `fallback-${isolatedLoc.ip}-${nearestNode.ip}`,
        );
        if (line) lines.push(line);
      }
    }

    return lines;
  };

  return (
    <group ref={groupRef}>
      {/* Main globe sphere */}
      <mesh>
        <sphereGeometry args={[2, 64, 32]} />
        <meshBasicMaterial color="black" transparent opacity={0.9} />
      </mesh>

      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[2.005, 64, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          transparent
          opacity={0.05}
        />
      </mesh>

      {createCountryLines()}
      {createConnectionLines()}
      {createNodeMarkers()}
    </group>
  );
}

export function Globe3D({ locations, height = "500px" }: GlobeProps) {
  const [hoveredNode, setHoveredNode] = useState<TooltipState | null>(null);

  return (
    <div
      style={{
        width: "100%",
        height,
        background: "transparent",
        position: "relative",
      }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <GlobeScene locations={locations} setHoveredNode={setHoveredNode} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
          zoomSpeed={0.6}
          rotateSpeed={0.4}
          minDistance={3}
          maxDistance={10}
        />
      </Canvas>

      {hoveredNode && (
        <div
          style={{
            position: "fixed",
            left: hoveredNode.x + 15,
            top: hoveredNode.y + 15,
            pointerEvents: "none",
            zIndex: 1000,
          }}
          className="bg-popover text-popover-foreground border-border rounded-md border px-3 py-2 text-sm shadow-lg">
          <div className="space-y-1">
            <div className="font-mono text-xs font-semibold">
              {hoveredNode.ip}
            </div>
            {(hoveredNode.city || hoveredNode.country) && (
              <div className="text-muted-foreground text-xs">
                {[hoveredNode.city, hoveredNode.country]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
            <div className="text-muted-foreground text-xs">
              {hoveredNode.nodeCount} node
              {hoveredNode.nodeCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
