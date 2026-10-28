import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

export declare const AlertDialog: typeof AlertDialogPrimitive.Root;
export declare const AlertDialogTrigger: typeof AlertDialogPrimitive.Trigger;
export declare const AlertDialogPortal: typeof AlertDialogPrimitive.Portal;

export declare const AlertDialogOverlay: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> &
    React.RefAttributes<React.ElementRef<typeof AlertDialogPrimitive.Overlay>>
>;

export declare const AlertDialogContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof AlertDialogPrimitive.Content>>
>;

export declare const AlertDialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export declare const AlertDialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;

export declare const AlertDialogTitle: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> &
    React.RefAttributes<React.ElementRef<typeof AlertDialogPrimitive.Title>>
>;

export declare const AlertDialogDescription: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description> &
    React.RefAttributes<React.ElementRef<typeof AlertDialogPrimitive.Description>>
>;

export declare const AlertDialogAction: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> &
    React.RefAttributes<React.ElementRef<typeof AlertDialogPrimitive.Action>>
>;

export declare const AlertDialogCancel: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> &
    React.RefAttributes<React.ElementRef<typeof AlertDialogPrimitive.Cancel>>
>;
