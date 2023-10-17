import {
  IconAngle,
  IconAspectRatio,
  IconCamera,
  IconFunction,
  IconGrain,
  IconMapPin,
  IconRun,
  type Icon,
} from "@tabler/icons-react";
import type Exif from "exif";
import type { ReactNode } from "react";
import { formatGPS } from "~/lib/exif";
import { aspectRatio } from "~/lib/utils";

export function ExifDetails({ details }: { details: Exif.ExifData }) {
  return (
    <div className="flex flex-col gap-1">
      <Detail Icon={IconCamera} title="Camera">
        {details.image.Make + " " + details.image.Model}
      </Detail>
      <Detail Icon={IconAspectRatio} title="Dimensions">
        {details.exif.ExifImageWidth} x {details.exif.ExifImageHeight} (
        {aspectRatio(
          details.exif.ExifImageWidth!,
          details.exif.ExifImageHeight!,
        )}
        )
      </Detail>
      <Detail Icon={IconAngle} title="Focal Length">
        {details.exif.FocalLengthIn35mmFormat} mm
      </Detail>
      <Detail Icon={IconFunction} title="Aperture">
        f{details.exif.FNumber}
      </Detail>
      <Detail Icon={IconRun} title="Shutter Speed">
        1/{1 / details.exif.ExposureTime!} s
      </Detail>
      <Detail Icon={IconGrain} title="ISO">
        ISO {details.exif.ISO}
      </Detail>
      <Detail
        Icon={IconMapPin}
        href={"https://www.google.com/maps?q=loc:" + formatGPS(details.gps)}
        title="GPS"
      >
        {formatGPS(details.gps)}
      </Detail>
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
