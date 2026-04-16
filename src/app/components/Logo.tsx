import logoImage from '../../imports/logo.jpeg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24',
  };

  return (
    <img
      src={logoImage}
      alt="Dumplings del Dragón"
      className={`${sizes[size]} w-auto object-contain ${className}`}
    />
  );
}
