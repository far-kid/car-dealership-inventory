import { useId } from 'react'

// Category artwork is illustrative: the API does not supply vehicle photos.
export function VehicleArt({
  category = 'Sedan',
  seed = '',
  hero = false,
}: {
  category?: string
  seed?: string
  hero?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const tall = /suv|truck|van|crossover/i.test(category)
  const colors = ['#718b83', '#9bacae', '#b1a290', '#73848f', '#a4a99a', '#8391a8']
  const paint =
    colors[Array.from(seed).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % colors.length]
  return (
    <svg
      viewBox="0 0 540 280"
      fill="none"
      className={hero ? 'vehicle-art hero-art' : 'vehicle-art'}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-paint`}
          x1="230"
          y1="110"
          x2="230"
          y2="224"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#edf1ed" />
          <stop offset=".35" stopColor={paint} />
          <stop offset="1" stopColor="#3b4d4e" />
        </linearGradient>
        <linearGradient
          id={`${id}-glass`}
          x1="210"
          y1="100"
          x2="270"
          y2="170"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b9cdcd" />
          <stop offset=".5" stopColor="#41575d" />
          <stop offset="1" stopColor="#23393d" />
        </linearGradient>
        <linearGradient
          id={`${id}-hood`}
          x1="330"
          y1="160"
          x2="395"
          y2="200"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d7e0da" />
          <stop offset="1" stopColor={paint} />
        </linearGradient>
      </defs>
      <ellipse cx="282" cy="237" rx="196" ry="12" fill="#1b352a" opacity=".10" />
      <ellipse cx="282" cy="237" rx="146" ry="5" fill="#1b352a" opacity=".10" />
      <path
        d={
          tall
            ? 'M78 176 103 126Q112 112 130 110L272 103Q291 102 310 121L351 160 428 178Q447 183 452 199L449 222 95 227Q78 219 78 203Z'
            : 'M78 183 108 162 155 123Q167 113 192 112L265 113Q290 114 311 134L345 163 424 179Q445 183 451 201L448 221 95 226Q78 218 78 201Z'
        }
        fill={`url(#${id}-paint)`}
        stroke="#35494a"
        strokeWidth="2"
      />
      <path
        d={tall ? 'm114 128 59-7-2 43-74 7Z' : 'm161 128 37-7-4 43-79 7Z'}
        fill={`url(#${id}-glass)`}
        stroke="#d1d8d0"
        strokeWidth="2"
      />
      <path
        d={tall ? 'm181 120 72-5 40 44-114 5Z' : 'm206 121 49 1 43 39-97 3Z'}
        fill={`url(#${id}-glass)`}
        stroke="#d1d8d0"
        strokeWidth="2"
      />
      <path
        d={tall ? 'm264 116 17 3q11 3 22 15l32 29-33-3Z' : 'm266 124 17 5 50 35-27-2Z'}
        fill={`url(#${id}-glass)`}
        stroke="#d1d8d0"
        strokeWidth="2"
      />
      <path d="m336 164 84 18 20 16-112-14-28-23Z" fill={`url(#${id}-hood)`} stroke="#b0bdb6" />
      <path
        d="m88 181 211-11 28 15 113 14M185 170l-2 49M303 174l-6 46"
        stroke="#4e6464"
        strokeWidth="1.5"
      />
      <path d="m111 210 203 1 1 15-212 1Z" fill="#304344" />
      <path d="m333 206 105 6-5 12-98-7Z" fill="#1d3033" />
      <path d="m335 210 96 6m-94 0 91 5" stroke="#81938e" />
      <path d="m326 190 42 7-4 7-37-6Z" fill="#f2f2d9" />
      <path d="m415 201 27 2-2 7-23-2Z" fill="#f2f2d9" />
      <path d="m83 184 12-4-2 14-12 2Z" fill="#c06954" />
      <path d="m281 158 20 2 5 8-25-2Z" fill={paint} stroke="#344849" />
      <path d="m204 179 18-1m-77 4 17-1" stroke="#d7e0dc" strokeWidth="3" strokeLinecap="round" />
      {[130, 317].map((x, index) => (
        <g key={x} transform={`translate(${x} ${index ? 217 : 220})`}>
          <ellipse rx="27" ry="29" fill="#1b292b" />
          <ellipse rx="18" ry="20" fill="#9ba9a5" />
          <ellipse rx="14" ry="16" fill="#344648" />
          {[0, 60, 120].map((angle) => (
            <path
              key={angle}
              d="M-13 0H13M-6-3 7 3"
              stroke="#c0cbc5"
              strokeWidth="3"
              transform={`rotate(${angle})`}
            />
          ))}
          <ellipse rx="5" ry="6" fill="#dce1d8" />
        </g>
      ))}
    </svg>
  )
}
