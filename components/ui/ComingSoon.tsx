"use client"

import { useRouter } from "next/navigation"

interface ComingSoonProps {
  title?: string
  description?: string
  feature?: string
}

export const ComingSoon = ({
  title = "Coming Soon",
  description = "We're working hard to bring you this amazing feature. Stay tuned!",
  feature = "feature",
}: ComingSoonProps) => {
  const router = useRouter()

  return (
    <div className="h-full w-full relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1e3266] to-[#2a4a8a]">
      {/* Flying Birds */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Bird Group 1 - Top Left */}
        <div className="absolute top-20 left-1/4 animate-fly-slow">
          <svg width="20" height="12" viewBox="0 0 20 12">
            <path d="M2,8 Q6,2 10,8 Q14,2 18,8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <div className="absolute top-32 left-1/3 animate-fly-slow-delayed">
          <svg width="16" height="10" viewBox="0 0 16 10">
            <path d="M2,6 Q5,2 8,6 Q11,2 14,6" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        {/* Bird Group 2 - Top Center */}
        <div className="absolute top-16 left-1/2 animate-fly-medium">
          <svg width="18" height="11" viewBox="0 0 18 11">
            <path
              d="M2,7 Q5.5,2 9,7 Q12.5,2 16,7"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1.3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="absolute top-28 left-1/2 transform translate-x-8 animate-fly-medium-delayed">
          <svg width="14" height="9" viewBox="0 0 14 9">
            <path
              d="M2,6 Q4.5,2 7,6 Q9.5,2 12,6"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Bird Group 3 - Top Right */}
        <div className="absolute top-24 right-1/4 animate-fly-slow">
          <svg width="22" height="13" viewBox="0 0 22 13">
            <path
              d="M2,9 Q6.5,2 11,9 Q15.5,2 20,9"
              stroke="white"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="absolute top-40 right-1/3 animate-fly-medium">
          <svg width="15" height="9" viewBox="0 0 15 9">
            <path
              d="M2,6 Q4.5,2 7.5,6 Q10.5,2 13,6"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.1"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Bird Group 4 - Middle Left */}
        <div className="absolute top-1/2 left-1/6 animate-fly-medium-delayed">
          <svg width="17" height="10" viewBox="0 0 17 10">
            <path
              d="M2,7 Q5,2 8.5,7 Q12,2 15,7"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Bird Group 5 - Middle Right */}
        <div className="absolute top-1/2 right-1/6 animate-fly-slow-delayed">
          <svg width="19" height="12" viewBox="0 0 19 12">
            <path
              d="M2,8 Q6,2 9.5,8 Q13,2 17,8"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1.3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Responsive Cloud SVG Background */}
      <div className="absolute bottom-0 left-0 w-full h-48 sm:h-64 md:h-80 lg:h-96 pointer-events-none">
        <svg viewBox="0 0 1400 300" className="w-full h-full sm:hidden" preserveAspectRatio="none">
          {/* Mobile - Shorter clouds */}
          <g className="animate-float-slow">
            <path
              d="M0,250 C0,220 30,200 70,200 C90,180 130,180 150,200 C180,190 220,195 240,220 C270,210 300,215 320,240 L320,300 L0,300 Z"
              fill="#4a90e2"
            />
            <path
              d="M250,260 C250,230 280,210 320,210 C340,190 380,190 400,210 C430,200 470,205 490,230 C520,220 550,225 570,250 L570,300 L250,300 Z"
              fill="#5b9bd5"
            />
            <path
              d="M500,270 C500,240 530,220 570,220 C590,200 630,200 650,220 C680,210 720,215 740,240 C770,230 800,235 820,260 L820,300 L500,300 Z"
              fill="#4a90e2"
            />
            <path
              d="M750,255 C750,225 780,205 820,205 C840,185 880,185 900,205 C930,195 970,200 990,225 C1020,215 1050,220 1070,245 L1070,300 L750,300 Z"
              fill="#5b9bd5"
            />
            <path
              d="M1000,275 C1000,245 1030,225 1070,225 C1090,205 1130,205 1150,225 C1180,215 1220,220 1240,245 C1270,235 1300,240 1320,265 L1400,265 L1400,300 L1000,300 Z"
              fill="#4a90e2"
            />
          </g>
          <g className="animate-float-medium">
            <path
              d="M-20,280 C-20,250 10,230 50,230 C70,210 110,210 130,230 C160,220 200,225 220,250 C250,240 280,245 300,270 L300,300 L-20,300 Z"
              fill="white"
            />
            <path
              d="M200,270 C200,240 230,220 270,220 C290,200 330,200 350,220 C380,210 420,215 440,240 C470,230 500,235 520,260 L520,300 L200,300 Z"
              fill="white"
            />
            <path
              d="M450,285 C450,255 480,235 520,235 C540,215 580,215 600,235 C630,225 670,230 690,255 C720,245 750,250 770,275 L770,300 L450,300 Z"
              fill="white"
            />
            <path
              d="M700,275 C700,245 730,225 770,225 C790,205 830,205 850,225 C880,215 920,220 940,245 C970,235 1000,240 1020,265 L1020,300 L700,300 Z"
              fill="white"
            />
            <path
              d="M950,290 C950,260 980,240 1020,240 C1040,220 1080,220 1100,240 C1130,230 1170,235 1190,260 C1220,250 1250,255 1270,280 L1400,280 L1400,300 L950,300 Z"
              fill="white"
            />
          </g>
        </svg>

        <svg viewBox="0 0 1400 450" className="w-full h-full hidden sm:block" preserveAspectRatio="none">
          {/* Desktop - Taller clouds */}
          <g className="animate-float-slow">
            <path
              d="M0,350 C0,310 30,270 70,270 C90,240 130,240 150,270 C180,250 220,260 240,300 C270,280 300,290 320,330 C340,310 370,320 390,350 L390,450 L0,450 Z"
              fill="#4a90e2"
            />
            <path
              d="M250,360 C250,320 280,280 320,280 C340,250 380,250 400,280 C430,260 470,270 490,310 C520,290 550,300 570,340 C590,320 620,330 640,360 L640,450 L250,450 Z"
              fill="#5b9bd5"
            />
            <path
              d="M500,370 C500,330 530,290 570,290 C590,260 630,260 650,290 C680,270 720,280 740,320 C770,300 800,310 820,350 C840,330 870,340 890,370 L890,450 L500,450 Z"
              fill="#4a90e2"
            />
            <path
              d="M750,355 C750,315 780,275 820,275 C840,245 880,245 900,275 C930,255 970,265 990,305 C1020,285 1050,295 1070,335 C1090,315 1120,325 1140,355 L1140,450 L750,450 Z"
              fill="#5b9bd5"
            />
            <path
              d="M1000,375 C1000,335 1030,295 1070,295 C1090,265 1130,265 1150,295 C1180,275 1220,285 1240,325 C1270,305 1300,315 1320,355 C1340,335 1370,345 1400,375 L1400,450 L1000,450 Z"
              fill="#4a90e2"
            />
          </g>
          <g className="animate-float-medium">
            <path
              d="M-20,390 C-20,350 10,310 50,310 C70,280 110,280 130,310 C160,290 200,300 220,340 C250,320 280,330 300,370 C320,350 350,360 370,390 L370,450 L-20,450 Z"
              fill="white"
            />
            <path
              d="M200,380 C200,340 230,300 270,300 C290,270 330,270 350,300 C380,280 420,290 440,330 C470,310 500,320 520,360 C540,340 570,350 590,380 L590,450 L200,450 Z"
              fill="white"
            />
            <path
              d="M450,395 C450,355 480,315 520,315 C540,285 580,285 600,315 C630,295 670,305 690,345 C720,325 750,335 770,375 C790,355 820,365 840,395 L840,450 L450,450 Z"
              fill="white"
            />
            <path
              d="M700,385 C700,345 730,305 770,305 C790,275 830,275 850,305 C880,285 920,295 940,335 C970,315 1000,325 1020,365 C1040,345 1070,355 1090,385 L1090,450 L700,450 Z"
              fill="white"
            />
            <path
              d="M950,400 C950,360 980,320 1020,320 C1040,290 1080,290 1100,320 C1130,300 1170,310 1190,350 C1220,330 1250,340 1270,380 C1290,360 1320,370 1340,400 L1400,400 L1400,450 L950,450 Z"
              fill="white"
            />
          </g>
        </svg>
      </div>

      <div className="z-10 text-center -translate-y-20 px-4">
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold text-white mb-4">{title}</h1>
        <p className="text-white/80 text-lg sm:text-xl mb-8 max-w-[600px] w-[90%] mx-auto">{description}</p>
        <button
          onClick={() => router.push("/dashboard/student")}
          className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-medium text-[#1e3266] hover:bg-white/90 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% {
            transform: translateX(0px) translateY(0px);
          }
          25% {
            transform: translateX(-10px) translateY(-5px);
          }
          50% {
            transform: translateX(5px) translateY(-8px);
          }
          75% {
            transform: translateX(-5px) translateY(-3px);
          }
        }

        @keyframes float-medium {
          0%, 100% {
            transform: translateX(0px) translateY(0px);
          }
          33% {
            transform: translateX(8px) translateY(-6px);
          }
          66% {
            transform: translateX(-12px) translateY(-4px);
          }
        }

        @keyframes fly-slow {
          0%, 100% {
            transform: translateX(0px) translateY(0px);
          }
          50% {
            transform: translateX(30px) translateY(-10px);
          }
        }

        @keyframes fly-medium {
          0%, 100% {
            transform: translateX(0px) translateY(0px);
          }
          50% {
            transform: translateX(-25px) translateY(-8px);
          }
        }

        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }

        .animate-float-medium {
          animation: float-medium 8s ease-in-out infinite;
        }

        .animate-fly-slow {
          animation: fly-slow 18s ease-in-out infinite;
        }

        .animate-fly-slow-delayed {
          animation: fly-slow 18s ease-in-out infinite;
          animation-delay: -6s;
        }

        .animate-fly-medium {
          animation: fly-medium 14s ease-in-out infinite;
        }

        .animate-fly-medium-delayed {
          animation: fly-medium 14s ease-in-out infinite;
          animation-delay: -4s;
        }
      `}</style>
    </div>
  )
}
