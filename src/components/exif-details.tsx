import {
  IconAngle,
  IconAspectRatio,
  IconCalendarEvent,
  IconCamera,
  IconClock,
  IconFunction,
  IconGrain,
  IconMapPin,
  IconRun,
  type Icon,
} from "@tabler/icons-react";
import type Exif from "exif";
import type { ReactNode } from "react";
import { formatExifDate, formatExifTime, formatGPS } from "~/lib/exif";
import { aspectRatio, cn } from "~/lib/utils";

type ExifDetailsProps = {
  details: Exif.ExifData;
  className?: string;
  lessDetails?: boolean;
};

export function ExifDetails({
  details,
  className,
  lessDetails = false,
}: ExifDetailsProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Detail Icon={IconCamera} title="Camera">
        {details.image.Make + " " + details.image.Model}
      </Detail>

      <Detail Icon={IconAspectRatio} title="Dimensions">
        {details.exif.ExifImageWidth}x{details.exif.ExifImageHeight} (
        {aspectRatio(
          details.exif.ExifImageWidth!,
          details.exif.ExifImageHeight!,
        )}
        )
      </Detail>

      {details.exif.DateTimeOriginal && (
        <Detail Icon={IconCalendarEvent} title="Date">
          {formatExifDate(details.exif.DateTimeOriginal)}
        </Detail>
      )}

      {details.exif.DateTimeOriginal && (
        <Detail Icon={IconClock} title="Time">
          {formatExifTime(details.exif.DateTimeOriginal)}
        </Detail>
      )}

      {!lessDetails && (
        <>
          <hr className="border-border" />

          {details.exif.FocalLengthIn35mmFormat && (
            <Detail Icon={IconAngle} title="Focal Length">
              {details.exif.FocalLengthIn35mmFormat} mm
            </Detail>
          )}

          {details.exif.FNumber && (
            <Detail Icon={IconFunction} title="Aperture">
              f{details.exif.FNumber}
            </Detail>
          )}

          {details.exif.ExposureTime && (
            <Detail Icon={IconRun} title="Shutter Speed">
              1/{1 / details.exif.ExposureTime} s
            </Detail>
          )}

          {details.exif.ISO && (
            <Detail Icon={IconGrain} title="ISO">
              ISO {details.exif.ISO}
            </Detail>
          )}

          {Object.keys(details.gps).length !== 0 && (
            <>
              <hr className="border-border" />

              <Detail
                Icon={IconMapPin}
                href={
                  "https://www.google.com/maps?q=loc:" + formatGPS(details.gps)
                }
                title="GPS"
              >
                {formatGPS(details.gps, 4)}
              </Detail>
            </>
          )}
        </>
      )}
    </div>
  );
}

type DetailProps = {
  Icon: Icon;
  href?: string;
  title?: string;
  children: ReactNode;
};

function Detail({ Icon, href, title, children }: DetailProps) {
  return (
    <div className="flex items-center gap-2" title={title}>
      <Icon size={16} className="text-muted-foreground" />
      <span className="w-24 text-sm text-muted-foreground">{title}</span>
      {href ? (
        <a href={href} className="font-mono text-sm underline">
          {children}
        </a>
      ) : (
        <span className="font-mono text-sm">{children}</span>
      )}
    </div>
  );
}
