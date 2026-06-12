export const saveAs = (data: Blob | File | string, filename: string) => {
  const anchor = document.createElement('a');
  anchor.href = typeof data === 'string' ? data : URL.createObjectURL(data);
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  anchor.remove();
};
