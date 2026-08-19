import type { CrossMathLevel, GridCell, Operator } from '../utils/generator';

/**
 * 사전 생성한 스테이지를 파일로 저장하기 위한 압축 인코딩.
 *
 * 형식:  "<rows>x<cols>|<cell>,<cell>,..."
 * 셀:    "<격자인덱스(36진수)><종류><값>"
 *          N = 주어진 숫자, B = 빈칸(뒤의 값이 정답), O = 연산자, E = 등호
 *   예)   "9x9|1cN30,1dO÷,1eN5,1fE,1gB6"
 *
 * 종류 표시를 대문자로 둔 이유: 인덱스가 36진수라 소문자 a~z가 그대로 나타난다.
 * 소문자를 구분자로 쓰면 인덱스 11('b')과 빈칸 표시가 충돌한다.
 *
 * 원본 JSON(셀당 {row,col,type,value,isBlank})에 비해 약 5배 작다.
 * 스테이지가 1000개까지 늘어나는 것을 감안한 선택이다.
 */

const RADIX = 36;

export function encodeLevel(level: CrossMathLevel): string {
  const parts = level.cells.map(c => {
    const idx = (c.row * level.cols + c.col).toString(RADIX);
    if (c.type === 'eq') return `${idx}E`;
    if (c.type === 'op') return `${idx}O${c.operator}`;
    return `${idx}${c.isBlank ? 'B' : 'N'}${c.value}`;
  });
  return `${level.rows}x${level.cols}|${parts.join(',')}`;
}

export function decodeLevel(encoded: string): CrossMathLevel {
  const [size, body] = encoded.split('|');
  const [rows, cols] = size.split('x').map(Number);
  if (!Number.isFinite(rows) || !Number.isFinite(cols)) {
    throw new Error(`스테이지 데이터가 손상되었습니다: ${encoded.slice(0, 24)}…`);
  }

  const cells: GridCell[] = body.split(',').map(token => {
    const at = token.search(/[NBOE]/);
    const idx = parseInt(token.slice(0, at), RADIX);
    const kind = token[at];
    const rest = token.slice(at + 1);
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    if (kind === 'E') return { row, col, type: 'eq' };
    if (kind === 'O') return { row, col, type: 'op', operator: rest as Operator };
    if (kind === 'B') return { row, col, type: 'num', value: Number(rest), isBlank: true };
    return { row, col, type: 'num', value: Number(rest) };
  });

  return { rows, cols, cells };
}
