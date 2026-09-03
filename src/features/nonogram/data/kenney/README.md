# Kenney 1-Bit Pack → 노노그램 후보

출처: [Kenney 1-Bit Pack](https://kenney.nl/assets/1-bit-pack) v1.2 — **CC0** (LICENSE-kenney.txt)

- `tilesheet.png` — 원본 타일시트 (16×16 타일, 1px 간격, 49×22 = 1,078개)
- `candidates.json` — 후보 1,036개. 각 항목: `index`(타일 번호), `col`/`row`(시트 위치), `w`/`h`(여백 크롭 후 크기), `fill`(채움 비율), `art`(행 문자열, `b`=채움 `.`=빈칸), `unique`(유일해), `logicOnly`(줄 논리만으로 풀림)
- `preview.txt` — `logicOnly: true` 인 622개를 █/· 로 미리보기

재생성:

```
npx tsx scripts/nonogram-from-tilesheet.ts src/features/nonogram/data/kenney/tilesheet.png 16 1 <outDir>
```

`levels.ts`에 넣을 때는 `art`를 그대로 복사하고 `palette: { b: '...' }`, `background`, `name`만 붙이면 된다.
