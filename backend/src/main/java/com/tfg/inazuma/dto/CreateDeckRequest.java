package com.tfg.inazuma.dto;

import java.util.List;

public record CreateDeckRequest(String name, List<Long> cardIds) {}
