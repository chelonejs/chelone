import { PhoneInput } from "@chelone/react";

export const mode = "input";

const countries = ["US", "GB", "FR", "JP"] as const;

/** `<PhoneInput>` splits a stored E.164 number into a country picker and a national-format field. */
export default function PhoneInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <PhoneInput
        source="phone"
        defaultCountry="US"
        allowedCountries={countries}
        defaultValue="+14155552671"
      />
    </div>
  );
}
