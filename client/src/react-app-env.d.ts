/// <summary>
/// TypeScript类型声明
/// </summary>

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg' {
  import React from 'react';
  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}
