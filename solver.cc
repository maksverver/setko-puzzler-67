#include <array>
#include <cassert>
#include <iostream>
#include <string>
#include <vector>

namespace {

const std::vector<std::string> layout = {
    "     . ",
    "    ...",
    "...... ",
    "....,  ",
    "...... ",
    "    ...",
    "     . "};

const int H = layout.size();
const int W = layout[0].size();

struct State {
    State(int peg, int dir) : i(8*peg + dir) {};

    bool operator==(const State &s) const { return i == s.i; }
    bool operator!=(const State &s) const { return i != s.i; }

    bool IsUndefined() const  { return i == -1; }
    bool IsDefined() const    { return i != -1; }
    bool IsUnsolvable() const { return i == -2; }
    bool IsSolved() const     { return i == -3; }
    bool IsUnsolved() const   { return i >=  0; }
    bool IsSolvable() const   { return IsSolved() || IsUnsolved(); }

    int Peg() const { return i/8; }
    int Dir() const { return i%8; }

    static const State undefined;
    static const State unsolvable;
    static const State solved;

private:
    State(int special) : i(special) {}

    short int i;
};

const State State::undefined  = State(-1);
const State State::unsolvable = State(-2);
const State State::solved     = State(-3);

std::ostream &operator<< (std::ostream &os, const State &s) {
    if (s.IsUndefined()) {
        return os << "undefined";
    }
    if (s.IsUnsolvable()) {
        return os << "unsolvable";
    }
    if (s.IsUnsolvable()) {
        return os << "solved";
    }
    assert(s.IsUnsolved());
    return os << "peg=" << s.Peg() << " dir=" << s.Dir();
}

int npeg;
int goal;
std::vector<std::array<int, 8>> adj;
std::vector<State> memo;

void PrintMask(std::ostream &os, unsigned mask) {
    int i = 0;
    for (const std::string &s : layout) {   
        for (char ch : s) {
            if (ch == '.' || ch == ',') {
                std::cout << ((mask & (1 << i++)) ? 'o' : ch);
            } else {
                std::cout << ' ';
            }
        }
        std::cout << '\n';
    }
    std::cout << '\n';
}

unsigned Next(unsigned mask, int peg, int dir) {
    int i = peg;
    if (i >= 0 && (mask & (1 << i))) {
        int j = adj[i][dir];
        if (j >= 0 && (mask & (1 << j))) {
            int k = adj[j][dir];
            if (k >= 0 && !(mask & (1 << k))) {
                return mask - (1 << i) - (1 << j) + (1 << k);
            }
        }
    }
    return 0;
}

State Solve(unsigned mask) {
    if (memo[mask].IsDefined()) {
        return memo[mask];
    }
    assert(mask != 0);
    // Alternatively, to allow ending at any position:
    // if ((mask & (mask - 1)) == 0) {
    if (mask == (1u << goal)) {
        return memo[mask] = State::solved;
    }
    State result = State::unsolvable;
    for (int peg = 0; peg < npeg; ++peg) {
        if (mask & (1 << peg)) {
            for (int dir = 0; dir < 8; ++dir) {
                unsigned next_mask = Next(mask, peg, dir);
                if (next_mask && Solve(next_mask).IsSolvable()) {
                    result = State(peg, dir);
                    goto done;
                }
            }
        }
    }
done:
    return memo[mask] = result;
}

}  // namespace


int main() {
    std::vector<std::vector<int>> idx(H, std::vector<int>(W, -1));
    for (int i = 0; i < H; ++i) {
        for (int j = 0; j < W; ++j) {
            char ch = layout[i][j];
            if (ch == '.' || ch == ',') {
                if (ch == ',') goal = npeg;
                idx[i][j] = npeg++;
            }
        }
    }
    assert(npeg < 32);  // assumes (at least) 32 bit wide integers
    adj.resize(npeg, std::array<int, 8>{-1, -1, -1, -1, -1, -1, -1, -1});
    for (int i = 0; i < H; ++i) {
        for (int j = 0; j < W; ++j) {
            if (idx[i][j] >= 0) {
                if (i > 0     && idx[i - 1][j] >= 0) adj[idx[i][j]][0] = idx[i - 1][j];
                if (i + 1 < H && idx[i + 1][j] >= 0) adj[idx[i][j]][1] = idx[i + 1][j];
                if (j > 0     && idx[i][j - 1] >= 0) adj[idx[i][j]][2] = idx[i][j - 1];
                if (j + 1 < W && idx[i][j + 1] >= 0) adj[idx[i][j]][3] = idx[i][j + 1];
                if (i > 0     && j > 0     && idx[i - 1][j - 1] >= 0) adj[idx[i][j]][4] = idx[i - 1][j - 1];
                if (i > 0     && j + 1 < W && idx[i - 1][j + 1] >= 0) adj[idx[i][j]][5] = idx[i - 1][j + 1];
                if (i + 1 < H && j > 0     && idx[i + 1][j - 1] >= 0) adj[idx[i][j]][6] = idx[i + 1][j - 1];
                if (i + 1 < H && j + 1 < W && idx[i + 1][j + 1] >= 0) adj[idx[i][j]][7] = idx[i + 1][j + 1];
            }
        }
    }
    memo.assign(1 << npeg, State::undefined);

    for (int start_peg = 0; start_peg < npeg; ++start_peg) {
        unsigned mask = (1 << npeg) - 1 - (1 << start_peg);
        State state = Solve(mask);
        assert(state.IsSolvable());
        if (state.IsSolvable()) {
            PrintMask(std::cout, mask);
            while (state.IsUnsolved()) {
                mask = Next(mask, state.Peg(), state.Dir());
                assert(mask != 0);
                std::cout << '\n';
                PrintMask(std::cout, mask);
                state = memo[mask];
            }
            assert(state.IsSolved());
            break;
        }
    }

    /*
    int zeros = 0, ones = 0;
    for(int i = 1; i < (1 << npeg); ++i) if (Solve(i).IsSolvable()) ++ones; else ++zeros;
    std::cout << zeros << ' ' << ones << std::endl;
    // Prints: 14050415 19504016
    */
}
