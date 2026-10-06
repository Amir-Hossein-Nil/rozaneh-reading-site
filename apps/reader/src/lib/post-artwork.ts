import assets from '../data/post-artwork.json';
type PostArtwork = { src: string; alt: string; position: string; width: number; height: number };
const artwork: Record<string, PostArtwork> = assets;
export function postArtwork(id: string): PostArtwork | undefined {
  return artwork[id];
}
