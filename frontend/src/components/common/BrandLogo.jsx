import { Link } from 'react-router-dom';

const sizes = {
  sm: { mark: 'h-9 w-9', text: 'text-xl' },
  md: { mark: 'h-11 w-11', text: 'text-2xl' },
  lg: { mark: 'h-14 w-14', text: 'text-3xl' },
};

const artworkSizes = { sm: 'w-36', md: 'w-48', lg: 'w-64' };

const BrandLogo = ({ size = 'md', variant = 'default', subtitle, artwork = false, className = '' }) => {
  const scale = sizes[size] || sizes.md;
  const homeColor = variant === 'inverse' ? 'text-white' : 'text-[#152D50]';

  return (
    <Link
      to="/"
      aria-label="HomeFix home"
      className={`inline-flex shrink-0 items-center ${artwork ? '' : 'gap-2.5'} ${className}`}
    >
      {artwork ? (
        <img
          src="/homefix-logo.png"
          alt="HomeFix - Connecting Home and Services"
          className={`${artworkSizes[size] || artworkSizes.md} h-auto rounded-xl`}
        />
      ) : (
        <>
          <img
            src="/homefix-mark.png"
            alt=""
            aria-hidden="true"
            className={`${scale.mark} rounded-xl object-contain`}
          />
          <span className="flex flex-col leading-none">
            <span className={`${scale.text} font-extrabold tracking-tight ${homeColor}`}>
              Home<span className={variant === 'inverse' ? 'text-cyan-300' : 'text-[#20A5C2]'}>F</span>
              <span className={variant === 'inverse' ? 'text-orange-300' : 'text-[#FF7A1A]'}>ix</span>
            </span>
            {subtitle && (
              <span className="mt-1 text-[11px] font-medium tracking-wide text-slate-500">
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
