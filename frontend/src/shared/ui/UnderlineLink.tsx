import { cn } from "@shared/lib/utils";

type UnderlineLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

export function UnderlineLink({ href, children, className, ...props }: UnderlineLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "group/navlink relative inline-flex items-center text-neutral-300 transition-colors hover:text-white",
        className
      )}
      {...props}
    >
      {children}
      <span className="bg-gradient-kleff pointer-events-none absolute right-0 -bottom-0.5 left-0 h-0.5 origin-center scale-x-0 transform rounded-full opacity-0 transition duration-200 ease-out group-hover/navlink:scale-x-100 group-hover/navlink:opacity-100" />
    </a>
  );
}
