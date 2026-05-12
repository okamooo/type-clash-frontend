import type { CurrentUser } from "@/contexts/CurrentUserContext";

type UserAvatarSize = "sm" | "lg";

type UserAvatarProps = Readonly<{
  user: Pick<CurrentUser, "name" | "iconImage">;
  size?: UserAvatarSize;
  className?: string;
}>;

const sizeClassNameBySize: Record<UserAvatarSize, string> = {
  sm: "size-10 border-2 text-lg",
  lg: "size-32 border-4 text-5xl shadow-[6px_6px_0_rgba(0,0,0,0.45)] sm:size-36",
};

export default function UserAvatar({
  user,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full border-white bg-[#123f7a] ${sizeClassNameBySize[size]} ${className}`}
    >
      {user.iconImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.iconImage}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        user.name.charAt(0)
      )}
    </div>
  );
}
