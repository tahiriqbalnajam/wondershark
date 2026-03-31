
import { Calendar } from 'lucide-react';

// CreditCard icon as React component
export function CreditCardIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={"lucide lucide-credit-card h-4 w-4 text-muted-foreground " + (props.className || "")}
			aria-hidden="true"
			{...props}
		>
			<rect width="20" height="14" x="2" y="5" rx="2"></rect>
			<line x1="2" x2="22" y1="10" y2="10"></line>
		</svg>
	);
}

export { Calendar };