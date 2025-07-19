'use client';

import { useRouter } from 'next/navigation';

interface ComingSoonProps {
  title?: string;
  description?: string;
  feature?: string;
}

export const ComingSoon = ({ 
  title = "Coming Soon", 
  description = "We're working hard to bring you this amazing feature. Stay tuned!",
  feature = "feature"
}: ComingSoonProps) => {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center bg-[#1e3266]">
      {/* SVG Background - Always show beautiful blue theme like NotFound */}
      <div className="absolute inset-0 w-full h-full -z-10">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1440 560"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative bottom-12"
        >
          <g mask="url(#SvgjsMask1000)" fill="none">
            <rect width="1440" height="560" x="0" y="0" fill="#1e3266" />
            <path d="M1488 560L0 560 L0 468.76Q37.54 386.3, 120 423.84Q189.28 373.12, 240 442.4Q291.19 421.58, 312 472.77Q366.23 455, 384 509.22Q410.11 463.33, 456 489.43Q489.15 402.58, 576 435.73Q623.36 411.09, 648 458.45Q729.6 420.04, 768 501.64Q816.33 429.97, 888 478.3Q896.89 415.19, 960 424.09Q1002.02 394.11, 1032 436.13Q1123.51 407.64, 1152 499.16Q1168.55 443.71, 1224 460.26Q1272.78 437.04, 1296 485.82Q1310.17 428, 1368 442.17Q1434.53 388.7, 1488 455.22z" fill="#356cb1" />
            <path d="M1488 560L0 560 L0 545.74Q39.06 464.8, 120 503.85Q162.45 474.31, 192 516.76Q262.98 467.74, 312 538.71Q325.37 480.08, 384 493.45Q461.74 499.19, 456 576.93Q497.16 546.09, 528 587.24Q552.74 539.98, 600 564.71Q601.25 493.96, 672 495.2Q708.76 459.97, 744 496.73Q803.3 484.03, 816 543.33Q866 521.34, 888 571.34Q913.61 476.95, 1008 502.56Q1087.71 462.27, 1128 541.98Q1194.09 488.07, 1248 554.16Q1293.39 479.56, 1368 524.95Q1450.82 487.77, 1488 570.59z" fill="white" />
          </g>
          <defs>
            <mask id="SvgjsMask1000">
              <rect width="1440" height="560" fill="#ffffff" />
            </mask>
          </defs>
        </svg>
      </div>

      {/* Moving Clouds */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Cloud 1 - Large, slow moving */}
        <div className="absolute top-20 left-0 w-32 h-16 bg-white/20 rounded-full blur-sm animate-float-slow"></div>
        <div className="absolute top-24 left-8 w-24 h-12 bg-white/15 rounded-full blur-sm animate-float-slow"></div>
        <div className="absolute top-28 left-16 w-20 h-10 bg-white/10 rounded-full blur-sm animate-float-slow"></div>
        
        {/* Cloud 2 - Medium, medium speed */}
        <div className="absolute top-40 right-20 w-28 h-14 bg-white/25 rounded-full blur-sm animate-float-medium"></div>
        <div className="absolute top-44 right-28 w-20 h-10 bg-white/20 rounded-full blur-sm animate-float-medium"></div>
        <div className="absolute top-48 right-36 w-16 h-8 bg-white/15 rounded-full blur-sm animate-float-medium"></div>
        
        {/* Cloud 3 - Small, fast moving */}
        <div className="absolute top-60 left-1/4 w-20 h-10 bg-white/30 rounded-full blur-sm animate-float-fast"></div>
        <div className="absolute top-64 left-1/4 w-16 h-8 bg-white/25 rounded-full blur-sm animate-float-fast"></div>
        
        {/* Cloud 4 - Medium, slow moving */}
        <div className="absolute top-80 right-1/3 w-24 h-12 bg-white/20 rounded-full blur-sm animate-float-slow"></div>
        <div className="absolute top-84 right-1/3 w-18 h-9 bg-white/15 rounded-full blur-sm animate-float-slow"></div>
        
        {/* Cloud 5 - Large, medium speed */}
        <div className="absolute top-32 left-1/2 w-36 h-18 bg-white/15 rounded-full blur-sm animate-float-medium"></div>
        <div className="absolute top-36 left-1/2 w-28 h-14 bg-white/10 rounded-full blur-sm animate-float-medium"></div>
        <div className="absolute top-40 left-1/2 w-20 h-10 bg-white/5 rounded-full blur-sm animate-float-medium"></div>
      </div>

      <div className="z-10 text-center -translate-y-20">
        <h1 className="text-8xl font-bold text-white mb-4">{title}</h1>
        <p className="text-white/80 text-xl mb-8 max-w-[600px] w-[90%] mx-auto">
          {description}
        </p>
        <button 
          onClick={() => router.push('/dashboard/student')}
          className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-medium text-primary hover:bg-white/90 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}; 