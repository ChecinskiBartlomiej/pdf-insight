import { MAX_FILE_BYTES } from '../../shared/schema';
export function validateFile(file: Pick<File, 'size' | 'name'>) {
  if (file.size > MAX_FILE_BYTES)
    throw new Error('Plik jest za duży. Maksymalny rozmiar to 10 MB.');
  if (!file.size) throw new Error('Plik jest pusty. Wybierz inny PDF.');
  if (!/\.pdf$/i.test(file.name))
    throw new Error('Wybierz plik z rozszerzeniem .pdf.');
}
