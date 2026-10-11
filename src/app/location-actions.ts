"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isValidZone } from "@/engine/time";
import { setOwnerLocation } from "@/lib/location-store";

const Form = z.object({
  name: z.string().trim().min(1).max(200),
  lat: z.coerce.number().min(-66).max(66), // sunrise-based timings need a daily sunrise and sunset
  lon: z.coerce.number().min(-180).max(180),
  tz: z.string().refine(isValidZone),
});

export async function setLocationAction(input: { name: string; lat: number; lon: number; tz: string }) {
  const parsed = Form.safeParse(input);
  if (!parsed.success) return;
  await setOwnerLocation(parsed.data);
  revalidatePath("/days");
}
