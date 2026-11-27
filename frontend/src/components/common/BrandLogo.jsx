import { Link } from 'react-router-dom';

const sizes = {
  sm: { mark: 'h-8 w-8', text: 'text-xl' },
  md: { mark: 'h-10 w-10', text: 'text-2xl' },
  lg: { mark: 'h-12 w-12', text: 'text-3xl' },
};

const artworkSizes = { sm: 'w-36', md: 'w-48', lg: 'w-64' };

const BrandLogo = ({ size = 'md', variant = 'default', subtitle, artwork = false, to = '/', className = '' }) => {
  const scale = sizes[size] || sizes.md;
  const isInverse = variant === 'inverse';
  const textColor = isInverse ? 'text-[#f7f5f0]' : 'text-[#1a1a18]';

  return (
    <Link
      to={to}
      aria-label={to === '/' ? 'Nivestry home' : 'Nivestry dashboard'}
      className={`inline-flex shrink-0 items-center ${artwork ? '' : 'gap-2.5'} ${className}`}
    >
      {artwork ? (
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-[#dedad0]">
          <img
            src="/homefix-mark.svg"
            alt="Nivestry"
            className="h-9 w-9 object-contain"
          />
          <span className="flex flex-col leading-none">
            <span className="text-xl font-extrabold tracking-tight text-[#1a1a18]">
              Nivestry
            </span>
            <span className="text-[10px] font-semibold text-[#6a675f] tracking-wider uppercase mt-1">
              Home Services
            </span>
          </span>
        </div>
      ) : (
        <>
          <img
            src="/homefix-mark.svg"
            alt="Nivestry"
            aria-hidden="true"
            className={`${scale.mark} rounded-xl object-contain`}
          />
          <span className="flex flex-col leading-none">
            <span className={`${scale.text} font-extrabold tracking-tight ${textColor}`}>
              Nivestry
            </span>
            {subtitle && (
              <span className={`mt-0.5 text-[11px] font-medium tracking-wide ${isInverse ? 'text-[#ebe8df]/80' : 'text-[#6a675f]'}`}>
                {subtitle}
              </span>
            )}
          </span>
        </>
      )}
    </Link>
  );
};

export default BrandLogo;
