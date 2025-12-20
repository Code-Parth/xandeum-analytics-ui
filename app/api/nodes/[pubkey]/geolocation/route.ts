import { NextRequest, NextResponse } from "next/server";
import { ipGeolocationService } from "@/services/ip-geolocation.service";
import { Logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ pubkey: string }>;
};

/**
 * GET /api/nodes/:pubkey/geolocation
 * Returns geolocation data for a specific node's IP addresses with history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { pubkey } = await params;

    if (!pubkey) {
      return NextResponse.json(
        { error: "Pubkey is required" },
        { status: 400 },
      );
    }

    const result =
      await ipGeolocationService.getNodeLocationsWithHistory(pubkey);

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
      firstSeen: loc.firstSeen,
      lastSeen: loc.lastSeen,
      snapshotCount: loc.snapshotCount,
    }));

    return NextResponse.json({
      pubkey,
      locations: mapLocations,
      total: mapLocations.length,
    });
  } catch (error) {
    Logger.error("Failed to get node geolocation", { error });

    return NextResponse.json(
      {
        error: "Failed to fetch node geolocation data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
