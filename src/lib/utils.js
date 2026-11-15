export function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  
  // Limpiamos el link por si tiene espacios o le falta el https
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

  // Expresión regular que atrapa TODO tipo de links de YouTube (Shorts, watch, youtu.be, etc)
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = cleanUrl.match(regExp);
  
  const videoId = (match && match[1]) ? match[1] : null;
  if (!videoId) return null;
  
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}