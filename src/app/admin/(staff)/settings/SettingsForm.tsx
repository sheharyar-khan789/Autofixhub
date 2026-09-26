"use client";

import { useActionState } from "react";
import { DAY_KEYS, DAY_LABELS, type BusinessSettings } from "@/lib/models";
import { saveSettingsAction, type ActionState } from "./actions";
import { FormMessage, inputClass, labelClass } from "../../_components/ui";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function SettingsForm({ settings }: { settings: BusinessSettings | null }) {
  const [state, formAction] = useActionState(saveSettingsAction, initialState);
  const hours = new Map((settings?.openingHours ?? []).map((d) => [d.day, d]));

  return (
    <form action={formAction} className="flex flex-col gap-space-xl">
      <fieldset className="flex flex-col gap-space-md rounded border border-border-medium p-space-lg">
        <legend className="px-space-xs font-code text-label-code text-text-muted">Business</legend>
        <div className="grid gap-space-md sm:grid-cols-2">
          <label className={labelClass}>
            Business name
            <input name="tradingName" defaultValue={settings?.tradingName} className={inputClass} />
          </label>
          <label className={labelClass}>
            Logo URL
            <input name="logoUrl" type="url" defaultValue={settings?.logoUrl} className={inputClass} />
          </label>
          <label className={labelClass}>
            Phone
            <input name="phone" defaultValue={settings?.phone} className={inputClass} />
          </label>
          <label className={labelClass}>
            WhatsApp (e.g. +447700900123)
            <input name="whatsapp" defaultValue={settings?.whatsapp} className={inputClass} />
          </label>
          <label className={labelClass}>
            Email
            <input name="email" type="email" defaultValue={settings?.email} className={inputClass} />
          </label>
          <label className={labelClass}>
            Google Maps URL
            <input name="mapsUrl" type="url" defaultValue={settings?.mapsUrl} className={inputClass} />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-space-md rounded border border-border-medium p-space-lg">
        <legend className="px-space-xs font-code text-label-code text-text-muted">Address</legend>
        <div className="grid gap-space-md sm:grid-cols-2">
          <label className={labelClass}>
            Address line 1
            <input name="addressLine1" defaultValue={settings?.address?.line1} className={inputClass} />
          </label>
          <label className={labelClass}>
            Address line 2
            <input name="addressLine2" defaultValue={settings?.address?.line2} className={inputClass} />
          </label>
          <label className={labelClass}>
            City
            <input name="addressCity" defaultValue={settings?.address?.city} className={inputClass} />
          </label>
          <label className={labelClass}>
            Postcode
            <input name="addressPostcode" defaultValue={settings?.address?.postcode} className={inputClass} />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-space-sm rounded border border-border-medium p-space-lg">
        <legend className="px-space-xs font-code text-label-code text-text-muted">Opening hours</legend>
        {DAY_KEYS.map((day) => {
          const d = hours.get(day);
          return (
            <div key={day} className="grid grid-cols-[6rem_1fr_1fr_auto] items-center gap-space-sm">
              <span className="font-code text-body-sm text-text-muted">{DAY_LABELS[day]}</span>
              <input name={`open_${day}`} type="time" defaultValue={d?.open} className={inputClass} />
              <input name={`close_${day}`} type="time" defaultValue={d?.close} className={inputClass} />
              <label className="flex items-center gap-space-xs font-code text-body-sm text-text-muted">
                <input type="checkbox" name={`closed_${day}`} defaultChecked={d?.closed} />
                Closed
              </label>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-space-md rounded border border-border-medium p-space-lg">
        <legend className="px-space-xs font-code text-label-code text-text-muted">Social links</legend>
        <div className="grid gap-space-md sm:grid-cols-2">
          <label className={labelClass}>
            Facebook
            <input name="socialFacebook" type="url" defaultValue={settings?.socialLinks?.facebook} className={inputClass} />
          </label>
          <label className={labelClass}>
            Instagram
            <input name="socialInstagram" type="url" defaultValue={settings?.socialLinks?.instagram} className={inputClass} />
          </label>
          <label className={labelClass}>
            TikTok
            <input name="socialTiktok" type="url" defaultValue={settings?.socialLinks?.tiktok} className={inputClass} />
          </label>
          <label className={labelClass}>
            X (Twitter)
            <input name="socialX" type="url" defaultValue={settings?.socialLinks?.x} className={inputClass} />
          </label>
          <label className={labelClass}>
            YouTube
            <input name="socialYoutube" type="url" defaultValue={settings?.socialLinks?.youtube} className={inputClass} />
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-space-md">
        <SubmitButton>Save settings</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
