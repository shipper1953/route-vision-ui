
interface UserAvatarProps {
  name: string;
}

export const UserAvatar = ({ name }: UserAvatarProps) => {
  const initials = name
    ? name.split(' ').map(name => name[0]).join('')
    : "?";

  return (
    <div className="h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-sm font-medium">
      {initials}
    </div>
  );
};
