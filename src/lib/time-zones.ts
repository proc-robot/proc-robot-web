import type { Option } from "./countries";

/**
 * Every IANA time zone the runtime knows, for the profile's time-zone picker.
 * Build the list on the server and pass it to the Client Component, like the
 * country list, so server and browser render the same options.
 */
export function timeZoneOptions(): Option[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return (zones.includes("UTC") ? zones : ["UTC", ...zones]).map((zone) => ({
    value: zone,
    label: zone.replaceAll("_", " "),
  }));
}
