import { Clock, Mail, MapPin, MessageCircle, PhoneCall } from "lucide-react";
import type { BusinessSettings } from "@/lib/models";
import { formatAddress, hoursRows, mapsHref, telHref, whatsappHref } from "@/lib/contact";
import { AnchorButton } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { showPlaceholders } from "@/lib/env";

export function ContactDetails({ settings }: { settings: BusinessSettings | null }) {
  const rows = hoursRows(settings);
  const maps = mapsHref(settings);
  const hasAny = settings?.phone || settings?.whatsapp || settings?.email || settings?.address || rows;
  if (!hasAny) {
    return showPlaceholders() ? (
      <Placeholder label="contact details">
        Add phone, WhatsApp, email, address and opening hours in the business settings.
      </Placeholder>
    ) : null;
  }
  return (
    <div className="grid gap-space-lg md:grid-cols-2">
      <ul className="flex flex-col gap-space-md">
        {settings?.phone && (
          <li className="flex gap-space-md">
            <PhoneCall className="mt-1 h-5 w-5 text-status-fault-red" aria-hidden="true" />
            <div>
              <p className="text-body-sm text-text-muted">Phone</p>
              <a className="font-code text-body-lg text-text-primary hover:text-primary" href={telHref(settings.phone)}>
                {settings.phone}
              </a>
            </div>
          </li>
        )}
        {settings?.whatsapp && (
          <li className="flex gap-space-md">
            <MessageCircle className="mt-1 h-5 w-5 text-status-pass-green" aria-hidden="true" />
            <div>
              <p className="text-body-sm text-text-muted">WhatsApp</p>
              <a className="font-code text-body-lg text-text-primary hover:text-primary" href={whatsappHref(settings.whatsapp)} target="_blank" rel="noopener">
                Message on WhatsApp
              </a>
            </div>
          </li>
        )}
        {settings?.email && (
          <li className="flex gap-space-md">
            <Mail className="mt-1 h-5 w-5 text-text-muted" aria-hidden="true" />
            <div>
              <p className="text-body-sm text-text-muted">Email</p>
              <a className="text-body-lg text-text-primary hover:text-primary" href={`mailto:${settings.email}`}>
                {settings.email}
              </a>
            </div>
          </li>
        )}
        {settings?.address && (
          <li className="flex gap-space-md">
            <MapPin className="mt-1 h-5 w-5 text-text-muted" aria-hidden="true" />
            <div>
              <p className="text-body-sm text-text-muted">Address</p>
              <address className="text-body-lg not-italic text-text-primary">{formatAddress(settings.address)}</address>
              {maps && (
                <AnchorButton variant="ghost" href={maps} target="_blank" rel="noopener noreferrer" className="!px-0">
                  Open in Google Maps
                </AnchorButton>
              )}
            </div>
          </li>
        )}
      </ul>
      {rows && (
        <div className="flex gap-space-md">
          <Clock className="mt-1 h-5 w-5 text-text-muted" aria-hidden="true" />
          <div className="w-full max-w-sm">
            <p className="text-body-sm text-text-muted">Opening hours</p>
            <table className="mt-space-xs w-full text-body-md">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.day} className="border-b border-border-subtle">
                    <th scope="row" className="py-1 pr-space-md text-left font-normal text-text-muted">{r.label}</th>
                    <td className={`py-1 text-right font-code ${r.closed ? "text-text-muted" : "text-text-primary"}`}>{r.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {settings?.hoursNote && <p className="mt-space-sm text-body-sm text-text-muted">{settings.hoursNote}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
