import { motion } from 'framer-motion';

export default function GradientText({ children, className = '', as = 'span', animate = false, ...props }) {
  const Tag = motion[as] || as;

  if (animate) {
    return (
      <Tag className={`gradient-text ${className}`} {...props}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag className={`gradient-text-hover ${className}`} data-text={typeof children === 'string' ? children : ''} {...props}>
      {children}
    </Tag>
  );
}