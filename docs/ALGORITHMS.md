# Tài liệu Thuật toán — MatrixLab

Tài liệu này đặc tả chi tiết các thuật toán toán học **thực sự được triển khai** trong mã nguồn MatrixLab, kèm mã nguồn và bài kiểm thử tương ứng. Mọi mô tả đều đối chiếu trực tiếp với mã nguồn tại `src/algorithms/`.

---

## Bảng truy vết triển khai (Implementation Traceability)

| Tính năng giao diện | Thuật toán thực thi | Tệp mã nguồn | Tệp kiểm thử |
|---|---|---|---|
| Số học phân số chính xác | Chuẩn hóa `BigInt` & thuật toán Euclid (GCD) | `src/algorithms/arithmetic/rational.ts` | `src/tests/rational.test.ts` |
| Cộng, trừ, nhân, nhân số, lũy thừa, so sánh | Cộng/trừ từng phần tử, nhân hàng-cột, lũy thừa nhị phân | `src/algorithms/arithmetic/matrixOps.ts` | `src/tests/operations-and-identities.test.ts` |
| Dạng bậc thang (REF) & RREF | Khử Gauss & Gauss-Jordan có chọn trụ | `src/algorithms/elimination/echelon.ts` | `src/tests/operations-and-identities.test.ts` |
| Định thức (`det A`) | Khai triển Laplace ($n \le 6$), Khử Gauss, Phân tích LU | `src/algorithms/determinant/determinant.ts` | `src/tests/operations-and-identities.test.ts` |
| Nghịch đảo (`A^{-1}`) & Phụ hợp (`adj A`) | Gauss-Jordan trên $[A \mid I]$; Phần bù đại số chuyển vị | `src/algorithms/inverse/inverse.ts` | `src/tests/operations-and-identities.test.ts` |
| Chuyển vị, Vết, Hạng, Khả nghịch, Phân loại | Hoán đổi chỉ số, tổng đường chéo, khử Gauss, Sylvester/Cholesky | `src/algorithms/matrix/properties.ts` | `src/tests/operations-and-identities.test.ts` |
| Giải hệ phương trình tuyến tính ($AX=B$) | Gauss, Gauss-Jordan, Cramer, $X=A^{-1}B$ & Kronecker-Capelli | `src/algorithms/linear-systems/linearSystems.ts` | `src/tests/linear-systems-and-advanced.test.ts` |
| Trị riêng, Vectơ riêng & Chéo hóa | Faddeev–LeVerrier + Hessenberg (Householder) + QR dịch chuyển | `src/algorithms/eigenvalues/eigen.ts` | `src/tests/linear-systems-and-advanced.test.ts` |
| Phân tích LU, QR, Cholesky | Doolittle ($PA=LU$), Modified Gram-Schmidt, Cholesky | `src/algorithms/decomposition/decompositions.ts` | `src/tests/linear-systems-and-advanced.test.ts` |
| Không gian nghiệm, Hàng/Cột, Độc lập tuyến tính | RREF tách biến tự do, trích cột trụ | `src/algorithms/vector-spaces/vectorSpaces.ts` | `src/tests/linear-systems-and-advanced.test.ts` |

---

## 1. Số học phân số chính xác (`BigInt Rational`) và Dấu phẩy động

1. **Tên thuật toán:** Số học phân số `BigInt` chuẩn hóa qua thuật toán Euclid.
2. **Mục đích:** Bảo toàn giá trị hữu tỉ chính xác qua các phép tính đại số tuyến tính mà không bị sai số làm tròn dấu phẩy động hoặc tràn số nguyên 53-bit.
3. **Cơ sở toán học:** Trường số hữu tỉ $\mathbb{Q} = \{ p/q \mid p \in \mathbb{Z}, q \in \mathbb{Z}_{>0}, \gcd(|p|, q) = 1 \}$.
4. **Điều kiện áp dụng:** Đầu vào là số nguyên, phân số `p/q` ($q \neq 0$), số thập phân hữu hạn hoặc ký hiệu khoa học ở chế độ `exact` hoặc `auto` (với ma trận $\le 10 \times 10$).
5. **Nguyên lý hoạt động:** Sau mỗi phép cộng, trừ, nhân, chia, phân số được rút gọn bằng $\gcd(|p|, q)$ và chuẩn hóa mẫu số dương.
6. **Quy trình thực hiện:**
   - Nếu $q < 0$, đổi dấu cả $p$ và $q$.
   - Nếu $p = 0$, trả về $0/1$.
   - Tính $g = \gcd(|p|, q)$ bằng thuật toán Euclid lặp, trả về $(p/g)/(q/g)$.
7. **Giả mã:**
```text
Hàm normalize(num, den):
  Nếu den == 0 -> Báo lỗi
  Nếu num == 0 -> Trả về (0, 1)
  Nếu den < 0 -> num = -num; den = -den
  g = gcd(|num|, den)
  Trả về (num / g, den / g)
```
8. **Công thức toán học:** $\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}$, $\frac{a}{b} \cdot \frac{c}{d} = \frac{ac}{bd}$, $\frac{a}{b} \div \frac{c}{d} = \frac{ad}{bc}$.
9. **Độ phức tạp thời gian:** $O(\log(\min(|p|, q)))$ theo độ dài bit cho bước Euclid.
10. **Độ phức tạp bộ nhớ:** $O(\text{số bit của tử và mẫu})$.
11. **Độ chính xác số học:** Tuyệt đối (không có sai số làm tròn) trong chế độ `exact`. Chế độ `numerical` dùng IEEE-754 `number` với dung sai mặc định $\varepsilon = 10^{-10}$ và chọn trụ từng phần.
12. **Trường hợp đặc biệt:** `1/0` bị từ chối ngay khi phân tích; `-0` chuẩn hóa thành `0/1`.
13. **Giới hạn:** Kích thước tử/mẫu tăng nhanh khi ma trận lớn; chế độ `auto` tự chuyển sang số học dấu phẩy động nếu kích thước $> 10 \times 10$.
14. **Vị trí triển khai:** `src/algorithms/arithmetic/rational.ts`, `src/algorithms/arithmetic/scalar.ts`.
15. **Bài kiểm thử:** `src/tests/rational.test.ts`.

---

## 2. Các phép toán ma trận cơ bản và Lũy thừa nhị phân

1. **Tên thuật toán:** Cộng/trừ từng phần tử, Nhân hàng–cột chuẩn, Lũy thừa nhị phân (Binary Exponentiation).
2. **Mục đích:** Tính $A \pm B$, $AB$, $kA$, $A^n$ ($n \in \mathbb{Z}$) và kiểm tra $A = B$.
3. **Cơ sở toán học:** Không gian ma trận $M_{m\times n}(\mathbb{F})$ và tính kết hợp của phép nhân ma trận vuông.
4. **Điều kiện áp dụng:** Cộng/trừ/so sánh yêu cầu cùng cỡ $m \times n$; Nhân yêu cầu $\text{cols}(A) = \text{rows}(B)$; Lũy thừa yêu cầu ma trận vuông (và khả nghịch nếu $n < 0$).
5. **Nguyên lý hoạt động:** Lũy thừa nhị phân phân rã $|n|$ theo biểu diễn nhị phân để giảm số phép nhân ma trận từ $O(|n|)$ xuống $O(\log |n|)$.
6. **Quy trình thực hiện ($A^n$):** Nếu $n=0$ trả về $I$. Nếu $n<0$ tính $A^{-1}$ bằng Gauss-Jordan rồi nâng lên $|n|$. Lặp theo từng bit của $|n|$: nhân tích lũy khi bit lẻ và bình phương ma trận cơ sở.
7. **Giả mã (Nhân ma trận & Lũy thừa):**
```text
Nhân(A[m][n], B[n][p]):
  Với i từ 0..m-1, j từ 0..p-1:
    C[i][j] = 0
    Với k từ 0..n-1: C[i][j] += A[i][k] * B[k][j]
Lũy_thừa(A, n):
  Nếu n < 0: base = Nghịch_đảo(A); n = -n ngược lại base = A
  res = I
  Trong khi n > 0:
    Nếu n lẻ: res = Nhân(res, base)
    n = floor(n / 2)
    Nếu n > 0: base = Nhân(base, base)
```
8. **Công thức toán học:** $C_{ij} = \sum_{k=1}^{n} A_{ik}B_{kj}$.
9. **Độ phức tạp thời gian:** Cộng/trừ/nhân số/chuyển vị: $O(mn)$; Nhân ma trận: $O(mnp)$ (vuông: $O(n^3)$); Lũy thừa: $O(k^3 \log |n|)$.
10. **Độ phức tạp bộ nhớ:** $O(mp)$ cho ma trận kết quả và $O(k^2)$ cho mỗi bước trung gian.
11. **Độ chính xác số học:** Chính xác tuyệt đối ở chế độ `exact`; sai số tích lũy nhỏ ở chế độ `numerical` khi $|n|$ lớn.
12. **Trường hợp đặc biệt:** $A^0 = I_n$; $A^{-k} = (A^{-1})^k$ báo lỗi nếu $A$ suy biến.
13. **Giới hạn:** Giới hạn $|n| \le 50$ nhằm tránh tràn bộ nhớ phân số `BigInt`.
14. **Vị trí triển khai:** `src/algorithms/arithmetic/matrixOps.ts`.
15. **Bài kiểm thử:** `src/tests/operations-and-identities.test.ts`.

---

## 3. Biến đổi sơ cấp trên hàng, Khử Gauss (REF) và Gauss-Jordan (RREF)

1. **Tên thuật toán:** Khử Gauss và Gauss-Jordan với ghi nhận lịch sử biến đổi thực.
2. **Mục đích:** Đưa ma trận về dạng bậc thang (REF) hoặc dạng bậc thang rút gọn (RREF), làm nền tảng cho hạng, nghịch đảo, hệ phương trình và không gian vectơ.
3. **Cơ sở toán học:** Ba phép biến đổi sơ cấp trên hàng: (1) Hoán đổi $R_i \leftrightarrow R_j$, (2) Nhân hàng với $c \neq 0$: $R_i \leftarrow cR_i$, (3) Cộng bội hàng khác: $R_i \leftarrow R_i + cR_j$. Các phép biến đổi này bảo toàn tương đương hàng và không gian nghiệm.
4. **Điều kiện áp dụng:** Mọi ma trận kích thước $m \times n$ ($m, n \ge 1$).
5. **Nguyên lý hoạt động:** Ở chế độ số học, thuật toán chọn phần tử trụ có giá trị tuyệt đối lớn nhất trong cột (partial pivoting) để ổn định số học; ở chế độ phân số chính xác, ưu tiên hàng có trị tuyệt đối bằng $1$ nếu có để lời giải tự nhiên hơn.
6. **Quy trình thực hiện:**
   - Duyệt cột $c$ từ $0$ đến giới hạn cột trụ, giữ chỉ số hàng hiện tại `currentRow`.
   - Tìm hàng trụ hợp lệ. Nếu không có, chuyển sang cột tiếp theo.
   - Hoán đổi lên `currentRow` nếu cần và ghi bước `Hoán đổi hàng`.
   - Nếu ở chế độ RREF, chuẩn hóa hàng trụ để phần tử trụ bằng $1$.
   - Khử các phần tử khác $0$ phía dưới (REF) hoặc cả trên và dưới (RREF), lưu từng ma trận trung gian vào `steps`.
7. **Giả mã:**
```text
currentRow = 0
Với col từ 0 đến pivotLimit - 1:
  pivotRow = Chọn_trụ(M, currentRow, col)
  Nếu pivotRow == -1: tiếp tục cột sau
  Nếu pivotRow != currentRow: Hoán_đổi(R[currentRow], R[pivotRow]); Ghi_bước()
  Nếu chuẩn_hóa và M[currentRow][col] != 1:
    Chia hàng currentRow cho M[currentRow][col]; Ghi_bước()
  Với r trong các hàng mục tiêu (dưới trụ nếu REF, mọi r != currentRow nếu RREF):
    Nếu M[r][col] != 0:
      factor = M[r][col] / M[currentRow][col]
      R[r] = R[r] - factor * R[currentRow]; Ghi_bước()
  currentRow++
```
8. **Công thức toán học:** $E_k \cdots E_1 A = \operatorname{RREF}(A)$.
9. **Độ phức tạp thời gian:** $O(mn \min(m,n))$, với ma trận vuông là $O(n^3)$. Chế độ phân số chính xác có chi phí phụ thuộc độ lớn bit của phân số.
10. **Độ phức tạp bộ nhớ:** $O(mn)$ cho mỗi bước được lưu; tối đa $O(mn \cdot \text{số bước})$.
11. **Độ chính xác số học:** Tuyệt đối ở chế độ `exact`; dùng ngưỡng $|x| \le \varepsilon$ ở chế độ `numerical`.
12. **Trường hợp đặc biệt:** Ma trận không trả về `rank = 0` và không có phép biến đổi.
13. **Giới hạn:** Nếu ma trận cấp lớn ở chế độ số học có điều kiện xấu, ngưỡng $\varepsilon$ quá lớn hoặc quá nhỏ có thể ảnh hưởng đến nhận diện phần tử trụ bằng 0.
14. **Vị trí triển khai:** `src/algorithms/elimination/echelon.ts`.
15. **Bài kiểm thử:** `src/tests/operations-and-identities.test.ts`.

---

## 4. Định thức (`det A`)

1. **Tên thuật toán:** Khai triển Laplace, Khử Gauss và Phân tích $PA = LU$.
2. **Mục đích:** Tính định thức ma trận vuông $A$ và xác định tính khả nghịch.
3. **Cơ sở toán học:**
   - Khai triển Laplace theo hàng $i$: $\det(A) = \sum_{j=1}^n (-1)^{i+j} a_{ij} \det(M_{ij})$.
   - Khử Gauss: Hoán đổi hai hàng đổi dấu $\det$; cộng bội hàng này vào hàng khác giữ nguyên $\det$. Do đó $\det(A) = (-1)^s \prod_{i=1}^n U_{ii}$.
   - Phân tích $PA = LU$: $\det(P)\det(A) = \det(L)\det(U)$ với $\det(L) = 1$, $\det(P) = (-1)^s$.
4. **Điều kiện áp dụng:** Ma trận vuông $n \times n$. Riêng Laplace giới hạn $n \le 6$.
5. **Nguyên lý hoạt động:** Chế độ `auto` dùng Laplace cho $n \le 3$ (minh họa giáo dục) và khử Gauss cho $n \ge 4$.
6. **Quy trình thực hiện (Laplace):** Chọn hàng chứa nhiều số $0$ nhất để tối ưu số định thức con cần tính, đệ quy tính $\det(M_{ij})$ và tổng hợp các phần bù đại số.
7. **Giả mã (Gauss):**
```text
Chạy Khử_Gauss_không_chuẩn_hóa(A) -> thu được U và số lần hoán đổi s
det = (-1)^s * tích_{i=0..n-1} U[i][i]
```
8. **Công thức toán học:** $\det(A) = (-1)^s \prod_{i=1}^n U_{ii}$.
9. **Độ phức tạp thời gian:** Khử Gauss & LU: $O(n^3)$; Laplace: $O(n!)$.
10. **Độ phức tạp bộ nhớ:** Gauss/LU: $O(n^2)$; Laplace: $O(n^2)$ ngăn xếp đệ quy.
11. **Độ chính xác số học:** Chính xác tuyệt đối ở chế độ `exact`; dùng partial pivoting ở chế độ `numerical`.
12. **Trường hợp đặc biệt:** Ma trận $1 \times 1$ trả về $a_{11}$; ma trận có hàng/cột bằng $0$ cho $\det = 0$.
13. **Giới hạn:** Laplace không cho phép chạy với $n > 6$ để tránh treo trình duyệt.
14. **Vị trí triển khai:** `src/algorithms/determinant/determinant.ts`.
15. **Bài kiểm thử:** `src/tests/operations-and-identities.test.ts`.

---

## 5. Ma trận nghịch đảo (`A^{-1}`) và Ma trận phụ hợp (`adj A`)

1. **Tên thuật toán:** Khử Gauss-Jordan trên $[A \mid I]$ và Ma trận phần bù đại số chuyển vị.
2. **Mục đích:** Tìm $A^{-1}$ khi $A$ khả nghịch và $\operatorname{adj}(A)$ cho mọi ma trận vuông.
3. **Cơ sở toán học:** Nếu $R$ biến đổi $[A \mid I]$ thành $[I \mid B]$ thì $RA = I \implies B = A^{-1}$. Với $\operatorname{adj}(A) = C^T$, luôn có $A \cdot \operatorname{adj}(A) = \det(A) I$.
4. **Điều kiện áp dụng:** Ma trận vuông; $A^{-1}$ yêu cầu $\operatorname{rank}(A) = n$ ($\det A \neq 0$).
5. **Nguyên lý hoạt động:** Khử Gauss-Jordan trực tiếp trên ma trận ghép $n \times 2n$ với `maxPivotCol = n`. Nếu $\operatorname{rank}(A) < n$, kết luận suy biến và không trả về nghịch đảo.
6. **Quy trình thực hiện:** Ghép $[A \mid I_n]$ $\to$ RREF $\to$ Tách khối phải $A^{-1}$ $\to$ Kiểm tra sai số dư $\max(\|AA^{-1}-I\|_\infty, \|A^{-1}A-I\|_\infty)$.
7. **Giả mã:**
```text
M = [A | I]
(M', rank) = Gauss_Jordan(M, maxPivotCol = n)
Nếu rank < n: Trả về Không khả nghịch
A_inv = M'[:, n:2n]
Kiểm chứng A * A_inv == I
```
8. **Công thức toán học:** $[A \mid I] \longrightarrow [I \mid A^{-1}]$, $\operatorname{adj}(A)_{ij} = (-1)^{i+j}\det(M_{ji})$.
9. **Độ phức tạp thời gian:** Gauss-Jordan: $O(n^3)$; Phụ hợp dùng định thức con $O(n^5)$.
10. **Độ phức tạp bộ nhớ:** $O(n^2)$.
11. **Độ chính xác số học:** Kiểm chứng tự động sau khi tính.
12. **Trường hợp đặc biệt:** Ma trận $1 \times 1$ có $\operatorname{adj}([a]) = [1]$ để thỏa mãn $A \cdot \operatorname{adj}(A) = \det(A)I$.
13. **Giới hạn:** Tính $\operatorname{adj}(A)$ cho $n > 7$ có độ phức tạp $O(n^5)$ nên chậm hơn đáng kể so với Gauss-Jordan.
14. **Vị trí triển khai:** `src/algorithms/inverse/inverse.ts`.
15. **Bài kiểm thử:** `src/tests/operations-and-identities.test.ts`.

---

## 6. Hệ phương trình tuyến tính (`AX = B`)

1. **Tên thuật toán:** Khử Gauss, Gauss-Jordan, Quy tắc Cramer và Phương pháp nghịch đảo $X = A^{-1}B$.
2. **Mục đích:** Giải và biện luận đầy đủ nghiệm của hệ $AX = B$.
3. **Cơ sở toán học:** Định lý Kronecker–Capelli (Rouché–Capelli):
   - $\operatorname{rank}(A) < \operatorname{rank}([A \mid B]) \implies$ Vô nghiệm.
   - $\operatorname{rank}(A) = \operatorname{rank}([A \mid B]) = n \implies$ Nghiệm duy nhất.
   - $\operatorname{rank}(A) = \operatorname{rank}([A \mid B]) < n \implies$ Vô số nghiệm phụ thuộc $n - \operatorname{rank}(A)$ tham số tự do.
4. **Điều kiện áp dụng:** $\text{rows}(A) = \text{rows}(B)$. Cramer yêu cầu $A$ vuông, $B$ có 1 cột và $\det A \neq 0$. Phương pháp nghịch đảo yêu cầu $A$ vuông khả nghịch.
5. **Nguyên lý hoạt động:** Thực hiện khử trên $n$ cột đầu của $[A \mid B]$; phát hiện hàng mâu thuẫn $(0 \cdots 0 \mid c \neq 0)$ hoặc trích nghiệm duy nhất / biểu diễn tham số $t_1, t_2, \dots$.
6. **Quy trình thực hiện:** Lập $[A \mid B]$ $\to$ Khử Gauss hoặc Gauss-Jordan $\to$ Kiểm tra hàng mâu thuẫn $\to$ Tính RREF rút trích nghiệm $\to$ Kiểm chứng $\|AX - B\|_\infty$.
7. **Giả mã:**
```text
(R, rankA) = Elimination([A | B], maxPivotCol = n)
Nếu tồn tại hàng r >= rankA có R[r][n:] != 0 -> Vô nghiệm
Nếu rankA == n -> Nghiệm duy nhất X = RREF(R)[0:n, n:]
Ngược lại -> Đặt biến tại cột tự do là t_k, biểu diễn biến trụ theo t_k
```
8. **Công thức toán học:** $x_i = \frac{\det(A_i)}{\det(A)}$ (Cramer); $X = A^{-1}B$.
9. **Độ phức tạp thời gian:** Gauss/Gauss-Jordan: $O(mn\min(m,n))$; Cramer: $O(n^4)$ khi dùng định thức Gauss.
10. **Độ phức tạp bộ nhớ:** $O(m(n+k))$.
11. **Độ chính xác số học:** Bảo toàn phân số tuyệt đối ở chế độ `exact`.
12. **Trường hợp đặc biệt:** Hỗ trợ nhiều cột vế phải ($B$ cỡ $m \times k$); tự động phát hiện và từ chối Cramer khi $\det A = 0$.
13. **Giới hạn:** Biểu diễn tham số tường minh $x_i = \dots$ hiển thị cho vế phải 1 cột; nhiều cột vế phải hiển thị $\operatorname{RREF}([A \mid B])$.
14. **Vị trí triển khai:** `src/algorithms/linear-systems/linearSystems.ts`.
15. **Bài kiểm thử:** `src/tests/linear-systems-and-advanced.test.ts`.

---

## 7. Phân tích ma trận (`PA = LU`, `A = QR`, Cholesky `A = LL^T`)

1. **Tên thuật toán:** Phân tích Doolittle có chọn trụ từng phần ($PA = LU$), Gram-Schmidt cải tiến ($A = QR$), Thuật toán Cholesky–Banachiewicz ($A = LL^T$).
2. **Mục đích:** Phân rã ma trận thành các nhân tử tam giác và trực chuẩn.
3. **Cơ sở toán học:**
   - $PA = LU$: $P$ ma trận hoán vị, $L$ tam giác dưới đơn vị, $U$ tam giác trên.
   - $A = QR$: $Q^T Q = I_n$ ($m \ge n$), $R$ tam giác trên với $R_{jj} > 0$.
   - $A = LL^T$: tồn tại duy nhất với $L_{ii} > 0$ khi và chỉ khi $A$ đối xứng xác định dương.
4. **Điều kiện áp dụng:** LU yêu cầu vuông; QR rút gọn yêu cầu $m \ge n$ và các cột độc lập tuyến tính; Cholesky yêu cầu vuông, đối xứng và xác định dương.
5. **Nguyên lý hoạt động:** Modified Gram-Schmidt trừ hình chiếu trực giao tuần tự trên từng cột để ổn định số học tốt hơn Gram-Schmidt cổ điển. Cholesky tính từng cột của $L$ từ công thức $L_{ii} = \sqrt{A_{ii} - \sum_{k<i} L_{ik}^2}$.
6. **Giả mã (Modified Gram-Schmidt):**
```text
Với j từ 0..n-1:
  Với i từ 0..j-1:
    R[i][j] = dot(Q[:,i], Q[:,j])
    Q[:,j] -= R[i][j] * Q[:,i]
  R[j][j] = norm2(Q[:,j])
  Nếu R[j][j] <= tol -> Báo phụ thuộc tuyến tính
  Q[:,j] /= R[j][j]
```
7. **Độ phức tạp thời gian:** LU và Cholesky: $O(n^3)$; QR: $O(mn^2)$.
8. **Độ phức tạp bộ nhớ:** $O(mn)$ hoặc $O(n^2)$.
9. **Độ chính xác số học:** LU hỗ trợ phân số `exact`; QR và Cholesky dùng dấu phẩy động do chứa phép căn bậc hai và luôn kiểm chứng sai số tái tạo.
10. **Vị trí triển khai:** `src/algorithms/decomposition/decompositions.ts`.
11. **Bài kiểm thử:** `src/tests/linear-systems-and-advanced.test.ts`.

---

## 8. Trị riêng, Vectơ riêng và Chéo hóa ma trận

1. **Tên thuật toán:** Thuật toán Faddeev–LeVerrier (đa thức đặc trưng), Biến đổi Hessenberg Householder + Lặp QR dịch chuyển Wilkinson, Khử Gauss tìm không gian riêng.
2. **Mục đích:** Tính $\lambda$, cơ sở không gian riêng $E(\lambda)$ và phân tích $A = PDP^{-1}$.
3. **Cơ sở toán học:** $Av = \lambda v \iff (A - \lambda I)v = 0 \iff \det(A - \lambda I) = 0$.
4. **Điều kiện áp dụng:** Ma trận vuông $n \times n$. Chéo hóa trên $\mathbb{R}$ yêu cầu mọi trị riêng thực và $\sum \dim E(\lambda_i) = n$.
5. **Nguyên lý hoạt động:**
   - Tính đa thức đặc trưng $p(\lambda) = \det(\lambda I - A)$ qua vết của chuỗi ma trận $B_k = A(B_{k-1} + c_{k-1}I)$ (Faddeev–LeVerrier).
   - Với $n \le 2$, giải nghiệm đóng chính xác (kể cả cặp liên hợp phức).
   - Với $n \ge 3$, đưa $A$ về dạng Hessenberg trên bằng phản xạ Householder, sau đó thực hiện lặp QR với phép quay Givens và dịch chuyển Wilkinson, trích khối $1 \times 1$ (trị riêng thực) và khối $2 \times 2$ (cặp trị riêng phức liên hợp).
   - Với mỗi trị riêng thực $\lambda$, giải hệ thuần nhất $(A - \lambda I)v = 0$ để tìm cơ sở vectơ riêng và kiểm chứng $\max \|Av - \lambda v\|_\infty$.
6. **Độ phức tạp thời gian:** Faddeev–LeVerrier: $O(n^4)$; Hessenberg + QR lặp: $O(n^3)$ mỗi giai đoạn.
7. **Độ chính xác số học & Giới hạn:** Kết quả là **xấp xỉ số học dấu phẩy động**. Với cặp trị riêng phức, hệ thống báo cáo đầy đủ giá trị $\lambda = a \pm bi$ nhưng chưa trích xuất vectơ riêng phức trong $\mathbb{C}^n$.
8. **Vị trí triển khai:** `src/algorithms/eigenvalues/eigen.ts`.
9. **Bài kiểm thử:** `src/tests/linear-systems-and-advanced.test.ts`.

---

## 9. Không gian vectơ (`N(A)`, `R(A)`, `C(A)`, Độc lập tuyến tính)

1. **Tên thuật toán:** Khử Gauss-Jordan xác định cột trụ và biến tự do.
2. **Mục đích:** Tìm cơ sở, số chiều của không gian nghiệm thuần nhất, không gian hàng, không gian cột và kiểm tra độc lập tuyến tính.
3. **Nguyên lý hoạt động:**
   - $\mathcal{N}(A)$: Từ $\operatorname{RREF}(A)$, đặt từng biến tự do lần lượt bằng $1$ và các biến tự do khác bằng $0$ để thu hệ cơ sở $\dim \mathcal{N}(A) = n - r$.
   - $\mathcal{R}(A)$: Các hàng khác $0$ của $\operatorname{RREF}(A)$.
   - $\mathcal{C}(A)$: Các cột của ma trận $A$ **ban đầu** tại đúng chỉ số các cột trụ của $\operatorname{RREF}(A)$.
   - Độc lập tuyến tính: Độc lập khi và chỉ khi $\operatorname{rank}(A) = k$ (số vectơ cột); nếu phụ thuộc, lấy ngay vectơ đầu tiên trong cơ sở $\mathcal{N}(A)$ làm hệ số tổ hợp tuyến tính bằng $0$.
4. **Độ phức tạp thời gian:** $O(mn \min(m, n))$.
5. **Vị trí triển khai:** `src/algorithms/vector-spaces/vectorSpaces.ts`.
6. **Bài kiểm thử:** `src/tests/linear-systems-and-advanced.test.ts`.
