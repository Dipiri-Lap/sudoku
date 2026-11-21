import type { CrossMathLevel, GridCell, Operator } from '../utils/generator';

/**
 * 사전 생성한 스테이지를 파일로 저장하기 위한 압축 인코딩.
 *
 * 형식:  "<rows>x<cols>|<cell>,<cell>,..."
 * 셀:    "<격자인덱스(36진수)><종류><값>"
 *          N = 주어진 숫자, B = 빈칸(뒤의 값이 정답), O = 연산자, E = 등호,
 *          P = 비어 있는 연산자 칸(뒤의 기호가 정답 — 기호 관문)
 *   예)   "9x9|1cN30,1dO÷,1eN5,1fE,1gB6"
 *
 * 종류 표시를 대문자로 둔 이유: 인덱스가 36진수라 소문자 a~z가 그대로 나타난다.
 * 소문자를 구분자로 쓰면 인덱스 11('b')과 빈칸 표시가 충돌한다.
 *
 * 오답 타일이 있으면 뒤에 "|<값>,<값>,..." 을 붙인다 (10진수, 기호 오답은 기호 그대로). 없으면 생략 — 예전 데이터와 같은 형식.
 *   예)   "9x9|1cN30,...,1gB6|7,15"
 *
 * 안개 관문이면 그 뒤에 "|<안개 칸 인덱스(36진수)>,..." 를 하나 더 붙인다 (오답 칸이 비어 있어도 자리는 둔다).
 *   예)   "13x13|...|7,15|1c,1d,2e"
 *
 * 원본 JSON(셀당 {row,col,type,value,isBlank})에 비해 약 5배 작다.
 * 스테이지가 1000개까지 늘어나는 것을 감안한 선택이다.
 */

const RADIX = 36;

export function encodeLevel(level: CrossMathLevel): string {
  const parts = level.cells.map(c => {
    const idx = (c.row * level.cols + c.col).toString(RADIX);
    if (c.type === 'eq') return `${idx}E`;
    if (c.type === 'op') return `${idx}${c.isBlank ? 'P' : 'O'}${c.operator}`;
    return `${idx}${c.isBlank ? 'B' : 'N'}${c.value}`;
  });
  const base = `${level.rows}x${level.cols}|${parts.join(',')}`;
  const decoys = [...(level.decoys ?? []), ...(level.opDecoys ?? [])];
  const fog = level.cells.filter(c => c.fog).map(c => (c.row * level.cols + c.col).toString(RADIX));
  if (fog.length > 0) return `${base}|${decoys.join(',')}|${fog.join(',')}`;
  return decoys.length > 0 ? `${base}|${decoys.join(',')}` : base;
}

export function decodeLevel(encoded: string): CrossMathLevel {
  const [size, body, decoyPart, fogPart] = encoded.split('|');
  const [rows, cols] = size.split('x').map(Number);
  if (!Number.isFinite(rows) || !Number.isFinite(cols)) {
    throw new Error(`스테이지 데이터가 손상되었습니다: ${encoded.slice(0, 24)}…`);
  }

  const cells: GridCell[] = body.split(',').map(token => {
    const at = token.search(/[NBOEP]/);
    const idx = parseInt(token.slice(0, at), RADIX);
    const kind = token[at];
    const rest = token.slice(at + 1);
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    if (kind === 'E') return { row, col, type: 'eq' };
    if (kind === 'O') return { row, col, type: 'op', operator: rest as Operator };
    if (kind === 'P') return { row, col, type: 'op', operator: rest as Operator, isBlank: true };
    if (kind === 'B') return { row, col, type: 'num', value: Number(rest), isBlank: true };
    return { row, col, type: 'num', value: Number(rest) };
  });

  if (fogPart) {
    const fogIdx = new Set(fogPart.split(',').map(t => parseInt(t, RADIX)));
    for (const c of cells) if (fogIdx.has(c.row * cols + c.col)) c.fog = true;
  }

  const level: CrossMathLevel = { rows, cols, cells };
  if (decoyPart) {
    const tokens = decoyPart.split(',');
    // '-' 하나는 기호(뺄셈)다. 음수 오답은 만들지 않으므로 숫자와 헷갈릴 일이 없다.
    const nums = tokens.filter(t => /^\d+$/.test(t)).map(Number);
    const ops = tokens.filter(t => !/^\d+$/.test(t)) as Operator[];
    if (nums.length > 0) level.decoys = nums;
    if (ops.length > 0) level.opDecoys = ops;
  }
  return level;
}
