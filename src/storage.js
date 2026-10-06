// Todo lo local de DomiPrint vive aquí (AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';

const K = {
  printer: '@domiprint/printer',
  size: '@domiprint/size_v3', // escala de 6 tamaños (el 4 es el doble de siempre)
  draft: { domicilio: '@domiprint/draft_domicilio', texto: '@domiprint/draft_texto' },
  history: '@domiprint/history',
};

export const DEFAULT_SIZE = 4;
const MAX_HISTORIAL = 200;

async function leerJSON(key, fallback) {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export const getPrinter = () => leerJSON(K.printer, null);
export const setPrinter = (p) => AsyncStorage.setItem(K.printer, JSON.stringify(p));

export async function getSize() {
  try {
    const n = Number(await AsyncStorage.getItem(K.size));
    return n >= 1 && n <= 6 ? n : DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE;
  }
}
export const setSize = (n) => AsyncStorage.setItem(K.size, String(n));

// clave: 'domicilio' | 'texto'
export async function getDraft(clave = 'domicilio') {
  try {
    return (await AsyncStorage.getItem(K.draft[clave])) || '';
  } catch {
    return '';
  }
}
export async function setDraft(clave, texto) {
  try {
    if (texto) await AsyncStorage.setItem(K.draft[clave], texto);
    else await AsyncStorage.removeItem(K.draft[clave]);
  } catch {}
}

export const getHistory = () => leerJSON(K.history, []);

export async function addHistory({ tipo, texto }) {
  const lista = await getHistory();
  lista.unshift({
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    tipo,
    texto,
    ts: Date.now(),
  });
  await AsyncStorage.setItem(K.history, JSON.stringify(lista.slice(0, MAX_HISTORIAL)));
}

export const clearHistory = () => AsyncStorage.removeItem(K.history);
