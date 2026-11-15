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
export function getGoogleCalendarUrl(training, teamName) {
  if (!training || !training.date) return null;
  
  // Formatear fecha: 2023-11-15 -> 20231115
  const dateClean = training.date.replace(/-/g, '');
  
  // Manejar la hora (si no hay, ponemos 1 hora por defecto a las 18:00)
  let startTime = '180000';
  let endTime = '190000';
  
  if (training.start_time) {
    // 14:00 -> 140000
    startTime = training.start_time.replace(/:/g, '') + '00';
    // Calculamos la hora de fin sumando 1 hora
    const [h, m] = training.start_time.split(':');
    const endHour = (parseInt(h) + 1).toString().padStart(2, '0');
    endTime = endHour + m + '00';
  }
  
  const dates = `${dateClean}T${startTime}/${dateClean}T${endTime}`;
  
  const title = encodeURIComponent(`Entrenamiento: ${teamName}`);
  const details = encodeURIComponent(training.notes || 'Entrenamiento de Flag Football');
  const location = encodeURIComponent(training.location || '');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}