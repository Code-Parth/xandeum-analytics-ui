"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Wrapper } from "@/components/wrapper";
import { OrbitControls } from "@react-three/drei";
import { GeoJSONWorldData } from "@/types/geoJson";
import { useEffect, useRef, useState } from "react";
import { useNodesGeolocation } from "@/hooks";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggleButton } from "@/components/ui/theme-toggle-button";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";

interface NodeInfo {
  ip: string;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  isp: string | null;
  org: string | null;
  nodeCount: number;
  pubkeys: string[];
  firstSeen: string;
  lastSeen: string;
}

function Globe({
  setHoveredNode,
  setSelectedNode,
}: {
  setHoveredNode: React.Dispatch<
    React.SetStateAction<{
      ip: string;
      city: string | null;
      country: string | null;
      nodeCount: number;
      x: number;
      y: number;
    } | null>
  >;
  setSelectedNode: React.Dispatch<React.SetStateAction<NodeInfo | null>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [geoData, setGeoData] = useState<GeoJSONWorldData | null>(null);
  const { data: geoLocationData } = useNodesGeolocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
                    color: isDark ? "#ffffff" : "#000000",
                    transparent: true,
                    opacity: isDark ? 0.7 : 0.3,
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
    if (!geoLocationData?.locations) return null;

    return geoLocationData.locations.map((location, index) => {
      const sphereCoords = convertToSphereCoordinates(
        location.lng,
        location.lat,
        2.03,
      );

      return (
        <mesh
          key={`marker-${index}`}
          position={[sphereCoords.x, sphereCoords.y, sphereCoords.z]}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNode({
              ip: location.ip,
              city: location.city,
              country: location.country,
              countryCode: location.countryCode,
              region: location.region,
              isp: location.isp,
              org: location.org,
              nodeCount: location.nodeCount,
              pubkeys: location.pubkeys || [],
              firstSeen: location.firstSeen,
              lastSeen: location.lastSeen,
            });
          }}
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
    if (!geoLocationData?.locations || geoLocationData.locations.length < 2)
      return null;

    const lines: React.ReactElement[] = [];
    const validLocations = geoLocationData.locations.filter(
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

    for (const [, locations] of locationsByPubkey) {
      if (locations.length < 2) continue;

      for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
          const line = createConnection(
            locations[i],
            locations[j],
            `pubkey-${locations[i].ip}-${locations[j].ip}`,
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

    for (const [, locations] of locationsByCountry) {
      if (locations.length < 2) continue;

      // Find isolated locations in this country
      const isolated = locations.filter((loc) => !connectedIPs.has(loc.ip));
      const connected = locations.filter((loc) => connectedIPs.has(loc.ip));

      // Connect isolated to at least one other location
      for (const isolatedLoc of isolated) {
        // Try to connect to another location in the same country
        const target =
          connected.length > 0
            ? connected[0]
            : locations.find((l) => l.ip !== isolatedLoc.ip);

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
      <mesh>
        <sphereGeometry args={[2, 64, 32]} />
        <meshBasicMaterial
          color={isDark ? "#000000" : "#f5f5f5"}
          transparent
          opacity={isDark ? 0.85 : 0.95}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.01, 64, 32]} />
        <meshBasicMaterial
          color={isDark ? "#ffffff" : "#666666"}
          wireframe
          transparent
          opacity={isDark ? 0.07 : 0.15}
        />
      </mesh>

      {createCountryLines()}
      {createConnectionLines()}
      {createNodeMarkers()}
    </group>
  );
}

export default function WorldMapPage() {
  const [hoveredNode, setHoveredNode] = useState<{
    ip: string;
    city: string | null;
    country: string | null;
    nodeCount: number;
    x: number;
    y: number;
  } | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);

  return (
    <Wrapper>
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggleButton />
      </div>

      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Globe
          setHoveredNode={setHoveredNode}
          setSelectedNode={setSelectedNode}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.6}
          rotateSpeed={0.5}
          minDistance={4}
          maxDistance={12}
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

      <Sheet open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">Location Details</SheetTitle>
                <SheetDescription>
                  Network information for this geographic location
                </SheetDescription>
              </SheetHeader>

              <div className="h-[calc(100vh-8rem)] overflow-y-auto p-4">
                <div className="mt-6 space-y-6 pb-6">
                  {/* IP Address Card */}
                  <Card>
                    <CardContent>
                      <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                        IP Address
                      </div>
                      <div className="font-mono text-lg font-semibold">
                        {selectedNode.ip}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Location Info Card */}
                  <Card>
                    <CardContent>
                      <div className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                        Geographic Location
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {selectedNode.city && (
                            <Badge variant="secondary" className="text-sm">
                              {selectedNode.city}
                            </Badge>
                          )}
                          {selectedNode.region && (
                            <Badge variant="secondary" className="text-sm">
                              {selectedNode.region}
                            </Badge>
                          )}
                          {selectedNode.country && (
                            <Badge variant="default" className="text-sm">
                              {selectedNode.countryCode || selectedNode.country}
                            </Badge>
                          )}
                        </div>
                        {(selectedNode.isp || selectedNode.org) && (
                          <>
                            <Separator />
                            <div>
                              <div className="text-muted-foreground mb-1 text-xs">
                                Network Provider
                              </div>
                              <div className="text-sm font-medium">
                                {selectedNode.isp || selectedNode.org}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Card */}
                  <Card>
                    <CardContent>
                      <div className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                        Statistics
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-muted-foreground mb-1 text-xs">
                            Nodes
                          </div>
                          <div className="text-3xl font-bold">
                            {selectedNode.nodeCount}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1 text-xs">
                            Public Keys
                          </div>
                          <div className="text-3xl font-bold">
                            {selectedNode.pubkeys.length}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline Card */}
                  <Card>
                    <CardContent>
                      <div className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                        Activity Timeline
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-muted-foreground mb-1 text-xs">
                              First Seen
                            </div>
                            <div className="text-sm font-medium">
                              {formatDistanceToNow(
                                new Date(selectedNode.firstSeen),
                                { addSuffix: true },
                              )}
                            </div>
                            <div className="text-muted-foreground mt-0.5 text-xs">
                              {format(new Date(selectedNode.firstSeen), "PPp")}
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-muted-foreground mb-1 text-xs">
                              Last Seen
                            </div>
                            <div className="text-sm font-medium">
                              {formatDistanceToNow(
                                new Date(selectedNode.lastSeen),
                                { addSuffix: true },
                              )}
                            </div>
                            <div className="text-muted-foreground mt-0.5 text-xs">
                              {format(new Date(selectedNode.lastSeen), "PPp")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Nodes List */}
                  {selectedNode.pubkeys.length > 0 && (
                    <Card>
                      <CardContent>
                        <div className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                          Nodes at this Location
                        </div>
                        <div className="space-y-2">
                          {selectedNode.pubkeys.map((pubkey, idx) => (
                            <Link
                              key={idx}
                              href={`/node/${pubkey}`}
                              className="hover:bg-secondary block rounded-lg border p-3 transition-colors">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="text-muted-foreground mb-1 text-xs">
                                    Node {idx + 1}
                                  </div>
                                  <div className="font-mono text-sm">
                                    {pubkey.slice(0, 12)}...{pubkey.slice(-12)}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="shrink-0 cursor-pointer">
                                  <HugeiconsIcon
                                    icon={ArrowRight01Icon}
                                    strokeWidth={2}
                                  />
                                </Button>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Wrapper>
  );
}
