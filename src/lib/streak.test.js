import { describe, it, expect, vi, beforeEach } from 'vitest';

let getStreak;
let getBestStreak;

const encode = (obj) => btoa(JSON.stringify(obj));

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();

  vi.doMock('@/lib/wordOfDay', () => ({
    getTodayDateStr: () => '2026-05-18',
  }));

  const mod = await import('./streak.js');
  getStreak = mod.getStreak;
  getBestStreak = mod.getBestStreak;
});

describe('getStreak', () => {
  it('retorna 0 quando nao ha dados', () => {
    expect(getStreak()).toBe(0);
  });

  it('retorna 1 quando so jogou hoje', () => {
    localStorage.setItem('_s2z', encode({ '2026-05-18|TESTE': [{ won: true, attempts: 3 }] }));
    expect(getStreak()).toBe(1);
  });

  it('conta dias consecutivos para tras', () => {
    localStorage.setItem('_s2z', encode({
      '2026-05-18|TESTE': [{ won: true, attempts: 3 }],
      '2026-05-17|OUTRO': [{ won: false, attempts: 6 }],
      '2026-05-16|MAIS':  [{ won: true, attempts: 2 }],
    }));
    expect(getStreak()).toBe(3);
  });

  it('para no primeiro dia sem jogo', () => {
    localStorage.setItem('_s2z', encode({
      '2026-05-18|TESTE': [{ won: true, attempts: 3 }],
      '2026-05-16|OUTRO': [{ won: true, attempts: 2 }],
    }));
    expect(getStreak()).toBe(1);
  });

  it('combina 5 e 6 letras no streak', () => {
    localStorage.setItem('_s2z', encode({
      '2026-05-18|TESTE': [{ won: true, attempts: 3 }],
    }));
    localStorage.setItem('_s2z6', encode({
      '2026-05-17|ABCDEF': [{ won: true, attempts: 4 }],
    }));
    expect(getStreak()).toBe(2);
  });

  it('retorna 0 quando nao jogou hoje', () => {
    localStorage.setItem('_s2z', encode({
      '2026-05-17|TESTE': [{ won: true, attempts: 3 }],
    }));
    expect(getStreak()).toBe(0);
  });

  it('salva o melhor streak em localStorage', () => {
    localStorage.setItem('_s2z', encode({
      '2026-05-18|TESTE': [{ won: true, attempts: 3 }],
      '2026-05-17|OUTRO': [{ won: true, attempts: 2 }],
      '2026-05-16|MAIS':  [{ won: true, attempts: 1 }],
    }));
    expect(getStreak()).toBe(3);
    expect(getBestStreak()).toBe(3);
  });

  it('nao sobrescreve recorde maior com streak menor', () => {
    localStorage.setItem('_bsk', '7');
    localStorage.setItem('_s2z', encode({
      '2026-05-18|TESTE': [{ won: true, attempts: 3 }],
    }));
    expect(getStreak()).toBe(1);
    expect(getBestStreak()).toBe(7);
  });

  it('conta corretamente cruzando virada de mes', () => {
    // mock retorna 2026-05-18, mas vamos preencher um streak
    // que começa em maio e termina em abril (cruzando virada de mês não se aplica aqui
    // porque hoje é 18, mas podemos testar que dateMinusOne funciona com dia 1)
    // Testamos indiretamente: streak de 18 dias (voltando até 2026-05-01)
    const data = {};
    for (let d = 1; d <= 18; d++) {
      const date = `2026-05-${String(d).padStart(2, '0')}`;
      data[`${date}|TESTE`] = [{ won: true, attempts: 3 }];
    }
    localStorage.setItem('_s2z', encode(data));
    expect(getStreak()).toBe(18);
  });

  it('nao dobra o streak quando 5 e 6 letras sao jogados no mesmo dia', () => {
    localStorage.setItem('_s2z', encode({
      '2026-05-18|TESTE': [{ won: true, attempts: 3 }],
    }));
    localStorage.setItem('_s2z6', encode({
      '2026-05-18|ABCDEF': [{ won: true, attempts: 4 }],
    }));
    expect(getStreak()).toBe(1);
  });
});

describe('getStreak — virada de ano', () => {
  let getStreakYear;
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    vi.doMock('@/lib/wordOfDay', () => ({ getTodayDateStr: () => '2026-01-01' }));
    const mod = await import('./streak.js');
    getStreakYear = mod.getStreak;
  });

  it('conta streak cruzando 31 Dez para 1 Jan', () => {
    localStorage.setItem('_s2z', encode({
      '2026-01-01|TESTE': [{ won: true, attempts: 3 }],
      '2025-12-31|OUTRO': [{ won: true, attempts: 2 }],
      '2025-12-30|MAIS':  [{ won: true, attempts: 1 }],
    }));
    expect(getStreakYear()).toBe(3);
  });
});

describe('getStreak — fevereiro sem bissexto', () => {
  let getStreakFev28;
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    vi.doMock('@/lib/wordOfDay', () => ({ getTodayDateStr: () => '2026-03-01' }));
    const mod = await import('./streak.js');
    getStreakFev28 = mod.getStreak;
  });

  it('conta streak cruzando fim de fevereiro (28 dias, ano nao bissexto)', () => {
    localStorage.setItem('_s2z', encode({
      '2026-03-01|MARCO': [{ won: true, attempts: 3 }],
      '2026-02-28|FEVRO': [{ won: true, attempts: 2 }],
    }));
    expect(getStreakFev28()).toBe(2);
  });
});

describe('getStreak — fevereiro bissexto', () => {
  let getStreakFev29;
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    vi.doMock('@/lib/wordOfDay', () => ({ getTodayDateStr: () => '2024-03-01' }));
    const mod = await import('./streak.js');
    getStreakFev29 = mod.getStreak;
  });

  it('conta streak cruzando 29 de fevereiro (ano bissexto)', () => {
    localStorage.setItem('_s2z', encode({
      '2024-03-01|MARCO': [{ won: true, attempts: 3 }],
      '2024-02-29|SALTO': [{ won: true, attempts: 2 }],
    }));
    expect(getStreakFev29()).toBe(2);
  });
});
