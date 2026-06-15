---
title: Memory Fencing Optimization for LLVM
blurb: An LLVM compiler pass that automatically inserts and optimizes memory fences, guaranteeing correctness for concurrent programs under the TSO and PSO relaxed memory models, formulated as a max-flow problem.
description: An LLVM compiler pass implementing automated memory fence insertion and optimization for concurrent programs under relaxed memory models.
kind: Compilers · Systems
date: 2025-04-15
order: 2
tags: [LLVM, C++, Concurrency, Memory Models, Open Source]
repo: https://github.com/arg3t/cs4560_fencing
---

### Project Overview

This project explores how compilers can automatically enforce memory consistency in concurrent programs, specifically through **memory fences**, which are synchronization points that prevent processors from reordering certain memory operations.

Modern CPUs often relax the order of reads and writes for performance reasons. While this improves efficiency, it can also break the assumptions made by programmers about how data is shared between threads. The goal of this project was to design an **LLVM compiler pass** that can automatically insert and optimize these fences, ensuring correctness under two key **relaxed memory models**: **Total Store Ordering (TSO)** and **Partial Store Ordering (PSO)**.

The result is a system that guarantees program correctness while minimizing performance overhead by removing redundant fences using graph optimization techniques.

---

### How It Works

At its core, the project introduces **three LLVM passes**:

1. **Fence Insertion for TSO** - Ensures that store-load reorderings prohibited by TSO are respected in the generated code.
2. **Fence Insertion for PSO** - Handles the more relaxed PSO model, where even store-store reordering is allowed.
3. **Fence Optimization** - Applies a **max-flow min-cut algorithm** to detect and eliminate unnecessary fences without sacrificing correctness.

Each pass operates at the **LLVM Intermediate Representation (IR)** level, meaning the transformations are independent of the target architecture. This allows the backend compiler to decide whether to preserve or omit fences, depending on the guarantees provided by the hardware (for example, x86 architectures already enforce some of these rules).

---

### The Algorithmic Core

The most interesting part of the project is the optimization phase.
The idea is simple: represent the program's memory operations as a **directed graph**, where edges encode dependencies that must not be violated.

By applying a **Ford-Fulkerson max-flow algorithm**, the system computes a **minimum cut** that separates dependent operations.
This cut corresponds to the optimal set of fences that must remain, meaning that all others can be safely removed.

This approach ensures that the final program maintains the correct ordering of memory operations, but without redundant synchronization overhead.

---

### Testing and Validation

To ensure that the passes behave as expected, we implemented a **litmus test suite**, a collection of small concurrent programs used to test memory consistency.

These include concurrency patterns such as:

* **Message Passing (MP)** - A producer-consumer synchronization test.
* **Store Buffering (SB)** - A classic example of write-read reordering.
* **Load Buffering (LB)** - Tests circular read dependencies.
* **IRIW (Independent Reads of Independent Writes)** - Checks multi-reader consistency.


---

### Behind the Scenes

The project is written in **C++17**, built with **CMake**, and integrated with **LLVM 14**.
The pass infrastructure hooks into the LLVM `opt` tool, allowing developers to run the fencing passes directly on IR code:

```bash
opt -load-pass-plugin build/fencing/FencingPass.so -S -passes=fence-tso input.ll
opt -load-pass-plugin build/fencing/FencingPass.so -S -passes=fence-opt input.ll
```

The modular structure makes it easy to extend or adapt to new memory models in the future.
For testing, I used LLVM's `lit` framework to automatically validate generated IR against expected outcomes.

---

### Research Background

This project is an implementation of the work by **Morisset and Zappa Nardelli (2017)** on *Partially Redundant Fence Elimination for x86, ARM, and Power Processors*.

---

### Source Code

This project is open-source and available here: [cs4560_fencing](https://github.com/arg3t/cs4560_fencing).

---

**Authors:** Mihnea Bernevig & Yigit Colakoglu
