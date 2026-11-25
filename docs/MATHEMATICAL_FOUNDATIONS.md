# Cơ sở Toán học của MatrixLab

Tài liệu này trình bày các định nghĩa, định lý và đồng nhất thức Đại số tuyến tính làm nền tảng cho các thuật toán và quy trình kiểm chứng trong **MatrixLab**.

---

## 1. Tương đương hàng và Phép biến đổi sơ cấp

Hai ma trận $A, B \in M_{m\times n}(\mathbb{F})$ được gọi là **tương đương hàng** ($A \sim B$) nếu $B$ thu được từ $A$ qua hữu hạn phép biến đổi sơ cấp trên hàng:
1. $R_i \leftrightarrow R_j$ (hoán đổi hai hàng) — $\det$ đổi dấu $-1$.
2. $R_i \leftarrow c R_i$ ($c \neq 0$) — $\det$ nhân thêm $c$.
3. $R_i \leftarrow R_i + c R_j$ ($i \neq j$) — $\det$ không đổi.

**Lưu ý nghiêm ngặt:** Tương đương hàng ($A \sim B$) **không** phải là bằng nhau ($A = B$). Các phép biến đổi sơ cấp bảo toàn hạng ma trận, không gian hàng $\mathcal{R}(A)$ và tập nghiệm của hệ thuần nhất $Ax = 0$, nhưng làm thay đổi không gian cột $\mathcal{C}(A)$ và định thức (ngoại trừ phép loại 3).

---

## 2. Định thức, Hạng và Tính khả nghịch

Với ma trận vuông $A \in M_{n\times n}(\mathbb{F})$, các mệnh đề sau là tương đương:
- $A$ khả nghịch ($\exists A^{-1}: A A^{-1} = A^{-1} A = I_n$).
- $\det(A) \neq 0$.
- $\operatorname{rank}(A) = n$.
- $\operatorname{RREF}(A) = I_n$.
- Hệ thuần nhất $Ax = 0$ chỉ có nghiệm tầm thường $x = 0$.

Đồng nhất thức kiểm chứng:
- $\det(AB) = \det(A)\det(B)$
- $A \cdot \operatorname{adj}(A) = \operatorname{adj}(A) \cdot A = \det(A) I_n$
- Khi $\det(A) \neq 0$: $A^{-1} = \frac{1}{\det(A)} \operatorname{adj}(A)$

---

## 3. Định lý Kronecker–Capelli (Rouché–Capelli) cho Hệ $AX = B$

Xét hệ phương trình tuyến tính $A x = b$ với $A \in M_{m\times n}(\mathbb{F})$:
1. $\operatorname{rank}(A) < \operatorname{rank}([A \mid b]) \iff$ Hệ vô nghiệm (tồn tại hàng dạng $[0 \;\dots\; 0 \mid c]$ với $c \neq 0$).
2. $\operatorname{rank}(A) = \operatorname{rank}([A \mid b]) = n \iff$ Hệ có nghiệm duy nhất.
3. $\operatorname{rank}(A) = \operatorname{rank}([A \mid b]) = r < n \iff$ Hệ có vô số nghiệm tạo thành không gian afin chiều $n - r$.

---

## 4. Định lý Hạng – Số chiều (Rank–Nullity Theorem)

Với $A \in M_{m\times n}(\mathbb{F})$:
$$\operatorname{rank}(A) + \dim(\mathcal{N}(A)) = n$$
và
$$\dim(\mathcal{R}(A)) = \dim(\mathcal{C}(A)) = \operatorname{rank}(A) = \operatorname{rank}(A^T).$$

---

## 5. Phân loại Ma trận và Tiêu chuẩn Xác định dương

Với $A \in M_{n\times n}(\mathbb{R})$:
- **Đối xứng:** $A^T = A$.
- **Phản đối xứng:** $A^T = -A$ (suy ra $A_{ii} = 0$).
- **Trực giao:** $A^T A = A A^T = I_n$.
- **Xác định dương:** $A$ đối xứng và $x^T A x > 0$ với mọi $x \in \mathbb{R}^n \setminus \{0\}$. Tương đương theo **tiêu chuẩn Sylvester** (mọi định thức con chính góc $\Delta_k > 0$) và tương đương với sự tồn tại duy nhất của phân tích **Cholesky** $A = L L^T$ với $L_{ii} > 0$.

---

## 6. Trị riêng, Vectơ riêng và Chéo hóa

- Số $\lambda$ là trị riêng của $A$ nếu tồn tại vectơ $v \neq 0$ sao cho $Av = \lambda v$, tức là $\det(\lambda I - A) = 0$.
- **Bội đại số** của $\lambda$ là số bội nghiệm trong đa thức đặc trưng $p(\lambda)$.
- **Bội hình học** là $\dim E(\lambda) = \dim \mathcal{N}(A - \lambda I) = n - \operatorname{rank}(A - \lambda I)$.
- Luôn có $1 \le \text{bội hình học} \le \text{bội đại số}$.
- Ma trận $A$ **chéo hóa được** trên $\mathbb{R}$ khi và chỉ khi mọi trị riêng đều thực và tổng bội hình học bằng $n$ (hay có đủ $n$ vectơ riêng độc lập tuyến tính lập thành ma trận khả nghịch $P$ sao cho $A = P D P^{-1}$).

---

## 7. Số học Chính xác và Dung sai Số học

- **Số học chính xác (`exact`):** Thực hiện trên trường hữu tỉ $\mathbb{Q}$ bằng `BigInt`, bảo toàn đẳng thức đại số tuyệt đối (ví dụ $\frac{1}{2} + \frac{1}{3} = \frac{5}{6}$).
- **Số học dấu phẩy động (`numerical`):** Cần thiết cho các phép toán có chứa căn thức hoặc nghiệm đa thức bậc cao ($QR$, Cholesky, Trị riêng $n \ge 3$). Các phần tử có $|x| \le \varepsilon$ được coi là $0$ khi chọn phần tử trụ; sai số dư kiểm chứng (residual norm $\|AX - B\|_\infty$, $\|AA^{-1} - I\|_\infty$) luôn được tính và hiển thị minh bạch cho người dùng.
