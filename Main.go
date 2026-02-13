package main

import "fmt"

type JasiansNumber struct {
	Number1     int
	Number2     int
	Calculation string
}

func Add(a, b int) (Value int) {
	Value = a + b
	return
}

func Minus(a, b int) (Value int) {
	Value = a - b
	return
}

func Divide(a, b int) (Value int) {
	Value = a / b
	return
}

func Multiply(a, b int) (Value int) {
	Value = a * b
	return
}

func main() {
	Answer := JasiansNumber{
		Number1:     0,
		Number2:     0,
		Calculation: "",
	}

	fmt.Println("Hey Jasian enter your numbers, only 2 though :)")
	fmt.Scanln(&Answer.Number1, &Answer.Number2)

	fmt.Println("Choose bewteen +, -, *, /")
	fmt.Scanln(&Answer.Calculation)

	if Answer.Calculation == "+" {
		fmt.Printf("The answer is: %d", Add(Answer.Number1, Answer.Number2))
	} else if Answer.Calculation == "-" {
		fmt.Printf("The answer is: %d", Minus(Answer.Number1, Answer.Number2))
	} else if Answer.Calculation == "*" {
		fmt.Printf("The answer is: %d", Multiply(Answer.Number1, Answer.Number2))
	} else if Answer.Calculation == "/" {
		fmt.Printf("The answer is: %d", Divide(Answer.Number1, Answer.Number2))
	}
}
