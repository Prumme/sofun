import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants = cva('button', {
  variants: {
    variant: { default: 'button-primary', secondary: 'button-secondary', ghost: 'button-ghost' },
    size: { default: '', icon: 'button-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
type Props = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: Props) {
  const Comp = asChild ? Slot : 'button';
  return <Comp type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
