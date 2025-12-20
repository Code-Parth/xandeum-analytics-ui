import { NextResponse } from "next/server";
import { ipGeolocationService } from "@/services/ip-geolocation.service";
import { Logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/geolocation
 * Returns all stored geolocation data for the world map with historical node data
 */
export async function GET() {
  try {
    const result = await ipGeolocationService.getAllNodesWithGeolocation();

    const mapLocations = result.locations.map((loc) => ({
      ip: loc.ip,
      lat: loc.lat,
      lng: loc.lon, // WorldMap uses lng not lon
      city: loc.city,
      region: loc.region,
      country: loc.country,
      countryCode: loc.countryCode,
      isp: loc.isp,
      org: loc.org,
      nodeCount: loc.nodeCount,
      pubkeys: loc.pubkeys,
      firstSeen: loc.firstSeen,
      lastSeen: loc.lastSeen,
    }));

    return NextResponse.json({
      locations: mapLocations,
      totalNodes: result.totalNodes,
      totalLocations: result.totalLocations,
    });
  } catch (error) {
    Logger.error("Failed to get all geolocations", { error });

    return NextResponse.json(
      {
        error: "Failed to fetch geolocation data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
