import Image from "next/image";

import { avatarUrl } from "@/lib/avatar";

/**
 * A user's profile picture.
 *
 * The address is always the same route: when no picture has been uploaded the
 * server answers with a generated initials badge, so there is no broken-image
 * state to guard against here. `version` is passed after an upload so the
 * browser fetches the new picture instead of its copy of the old one.
 */
export default function Avatar({
  userId,
  name,
  version,
  size = 40,
  className = "",
}: {
  userId: string;
  name?: string | null;
  version?: string | number | Date | null;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={avatarUrl(userId, version)}
      alt={name ? `${name}'s profile picture` : "Profile picture"}
      width={size}
      height={size}
      unoptimized
      className={["shrink-0 rounded-full bg-[#EDEAFF] object-cover", className].join(" ")}
    />
  );
}
