import * as React from 'react';
import { VariantProps } from 'class-variance-authority';

export declare const buttonVariants: (props?: {
  variant?: 'default' | 'accent' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'nav' | null;
  size?: 'default' | 'sm' | 'lg' | 'icon' | null;
} & Record<string, unknown>) => string;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export declare const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;
