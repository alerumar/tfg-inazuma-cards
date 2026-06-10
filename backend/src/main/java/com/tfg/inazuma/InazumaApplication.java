package com.tfg.inazuma;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class InazumaApplication {

	public static void main(String[] args) {
		SpringApplication.run(InazumaApplication.class, args);
	}
}
