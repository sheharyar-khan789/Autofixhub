"use client";

import { DAY_KEYS, DAY_LABELS, type BusinessSettings } from "@/lib/models";
import { saveSettingsAction, type ActionState } from "./actions";
import { FieldError, fieldProps, FormMessage, inputClass, labelClass } from "../../_components/ui";
import { useAdminForm } from "../../_components/useAdminForm";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function SettingsForm({ settings }: { settings: BusinessSettings | null }) {
  const { state, pending, formProps } = useAdminForm(saveSettingsAction, initialState);
  const hours = new Map((settings?.openingHours ?? []).map((d) => [d.day, d]));

  return (
    <form {...formProps} className="flex flex-col gap-space-xl">
      <fieldset className="flex flex-col gap-space-md rounded border border-border-medium p-space-lg">
        <legend className="px-space-xs font-code text-label-code text-text-muted">Business</legend>
        <div className="grid gap-space-md sm:grid-cols-2">
          <label className={labelClass}>
            Business name
            <input {...fieldProps(state.fieldErrors, "tradingName")} defaultValue={settings?.tradingName} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="tradingName" />
          </label>
          <label className={labelClass}>
            Logo URL
            <input {...fieldProps(state.fieldErrors, "logoUrl")} type="url" defaultValue={settings?.logoUrl} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="logoUrl" />
          </label>
          <label className={labelClass}>
            Phone
            <input {...fieldProps(state.fieldErrors, "phone")} defaultValue={settings?.phone} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="phone" />
          </label>
          <label className={labelClass}>
            WhatsApp (e.g. +447700900123)
            <input {...fieldProps(state.fieldErrors, "whatsapp")} defaultValue={settings?.whatsapp} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="whatsapp" />
          </label>
          <label className={labelClass}>
            Email
            <input {...fieldProps(state.fieldErrors, "email")} type="email" defaultValue={settings?.email} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="email" />
          </label>
          <label className={labelClass}>
            Google Maps URL
            <input {...fieldProps(state.fieldErrors, "mapsUrl")} type="url" defaultValue={settings?.mapsUrl} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="mapsUrl" />
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
            <input {...fieldProps(state.fieldErrors, "addressCity")} defaultValue={settings?.address?.city} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="addressCity" />
          </label>
          <label className={labelClass}>
            Postcode
            <input {...fieldProps(state.fieldErrors, "addressPostcode")} defaultValue={settings?.address?.postcode} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="addressPostcode" />
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
              <input {...fieldProps(state.fieldErrors, `open_${day}`)} aria-label={`${DAY_LABELS[day]} opens`} type="time" defaultValue={d?.open} className={inputClass} />
              <input {...fieldProps(state.fieldErrors, `close_${day}`)} aria-label={`${DAY_LABELS[day]} closes`} type="time" defaultValue={d?.close} className={inputClass} />
              <label className="flex items-center gap-space-xs font-code text-body-sm text-text-muted">
                <input type="checkbox" name={`closed_${day}`} defaultChecked={d?.closed} />
                Closed
              </label>
              <span className="col-start-2 col-end-4 flex flex-col empty:hidden">
                <FieldError errors={state.fieldErrors} name={`open_${day}`} />
                <FieldError errors={state.fieldErrors} name={`close_${day}`} />
              </span>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-space-md rounded border border-border-medium p-space-lg">
        <legend className="px-space-xs font-code text-label-code text-text-muted">Social links</legend>
        <div className="grid gap-space-md sm:grid-cols-2">
          <label className={labelClass}>
            Facebook
            <input {...fieldProps(state.fieldErrors, "socialFacebook")} type="url" defaultValue={settings?.socialLinks?.facebook} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="socialFacebook" />
          </label>
          <label className={labelClass}>
            Instagram
            <input {...fieldProps(state.fieldErrors, "socialInstagram")} type="url" defaultValue={settings?.socialLinks?.instagram} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="socialInstagram" />
          </label>
          <label className={labelClass}>
            TikTok
            <input {...fieldProps(state.fieldErrors, "socialTiktok")} type="url" defaultValue={settings?.socialLinks?.tiktok} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="socialTiktok" />
          </label>
          <label className={labelClass}>
            X (Twitter)
            <input {...fieldProps(state.fieldErrors, "socialX")} type="url" defaultValue={settings?.socialLinks?.x} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="socialX" />
          </label>
          <label className={labelClass}>
            YouTube
            <input {...fieldProps(state.fieldErrors, "socialYoutube")} type="url" defaultValue={settings?.socialLinks?.youtube} className={inputClass} />
            <FieldError errors={state.fieldErrors} name="socialYoutube" />
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-space-md">
        <SubmitButton pending={pending}>Save settings</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
