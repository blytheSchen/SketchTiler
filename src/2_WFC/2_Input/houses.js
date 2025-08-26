const HOUSES = [
	// house 1
	[	// blueBase-redRoof
		new Int32Array([53,54,55,-1,]),
		new Int32Array([65,66,67,-1,]),
		new Int32Array([77,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,51,-1,]),
		new Int32Array([61,62,63,-1,]),
		new Int32Array([73,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],

	// house 2
	[	// blueBase-redRoof
		new Int32Array([53,56,55,-1,]),
		new Int32Array([65,68,67,-1,]),
		new Int32Array([77,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,51,-1,]),
		new Int32Array([61,64,63,-1,]),
		new Int32Array([73,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],

	// house 3
	[	// blueBase-redRoof
		new Int32Array([53,54,56,55,-1,]),
		new Int32Array([65,66,68,67,-1,]),
		new Int32Array([77,78,89,80,-1,]),
		new Int32Array([77,78,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,52,51,-1,]),
		new Int32Array([61,62,64,63,-1,]),
		new Int32Array([73,74,85,76,-1,]),
		new Int32Array([73,74,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 4
	[	// blueBase-redRoof
		new Int32Array([53,56,54,55,-1,]),
		new Int32Array([65,68,66,67,-1,]),
		new Int32Array([77,89,78,80,-1,]),
		new Int32Array([77,90,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,50,51,-1,]),
		new Int32Array([61,64,62,63,-1,]),
		new Int32Array([73,85,74,76,-1,]),
		new Int32Array([73,86,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 5
	[	// blueBase-redRoof
		new Int32Array([53,54,54,55,-1,]),
		new Int32Array([65,66,66,67,-1,]),
		new Int32Array([77,89,89,80,-1,]),
		new Int32Array([77,91,92,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,51,-1,]),
		new Int32Array([61,62,62,63,-1,]),
		new Int32Array([73,85,85,76,-1,]),
		new Int32Array([73,87,88,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 6
	[	// blueBase-redRoof
		new Int32Array([53,54,54,55,-1,]),
		new Int32Array([65,66,66,67,-1,]),
		new Int32Array([77,89,78,80,-1,]),
		new Int32Array([77,90,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,51,-1,]),
		new Int32Array([61,62,62,63,-1,]),
		new Int32Array([73,85,74,76,-1,]),
		new Int32Array([73,86,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 7
	[	// blueBase-redRoof
		new Int32Array([53,54,54,55,-1,]),
		new Int32Array([65,66,66,67,-1,]),
		new Int32Array([77,78,89,80,-1,]),
		new Int32Array([77,78,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,51,-1,]),
		new Int32Array([61,62,62,63,-1,]),
		new Int32Array([73,74,85,76,-1,]),
		new Int32Array([73,74,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 8
	[	// blueBase-redRoof
		new Int32Array([53,54,54,56,55,-1,]),
		new Int32Array([65,68,66,68,67,-1,]),
		new Int32Array([77,89,78,89,80,-1,]),
		new Int32Array([77,89,78,89,80,-1,]),
		new Int32Array([77,78,90,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,52,51,-1,]),
		new Int32Array([61,64,62,64,63,-1,]),
		new Int32Array([73,85,74,85,76,-1,]),
		new Int32Array([73,85,74,85,76,-1,]),
		new Int32Array([73,74,86,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 9
	[	// blueBase-redRoof
		new Int32Array([53,54,54,56,55,-1,]),
		new Int32Array([65,66,66,66,67,-1,]),
		new Int32Array([77,89,89,78,80,-1,]),
		new Int32Array([77,78,78,78,80,-1,]),
		new Int32Array([77,91,92,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,52,51,-1,]),
		new Int32Array([61,62,62,62,63,-1,]),
		new Int32Array([73,85,85,74,76,-1,]),
		new Int32Array([73,74,74,74,76,-1,]),
		new Int32Array([73,87,88,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 10
	[	// blueBase-redRoof
		new Int32Array([53,56,54,54,55,-1,]),
		new Int32Array([65,66,66,66,67,-1,]),
		new Int32Array([77,78,89,89,80,-1,]),
		new Int32Array([77,78,78,78,80,-1,]),
		new Int32Array([77,78,91,92,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,50,50,51,-1,]),
		new Int32Array([61,62,62,62,63,-1,]),
		new Int32Array([73,74,85,85,76,-1,]),
		new Int32Array([73,74,74,74,76,-1,]),
		new Int32Array([73,74,87,88,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 11
	[	// blueBase-redRoof
		new Int32Array([53,54,56,55,-1,]),
		new Int32Array([65,66,68,67,-1,]),
		new Int32Array([77,90,89,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,50,50,-1,]),
		new Int32Array([61,62,62,62,-1,]),
		new Int32Array([73,74,85,85,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 12
	[	// blueBase-redRoof
		new Int32Array([53,54,56,55,-1,]),
		new Int32Array([65,66,68,67,-1,]),
		new Int32Array([77,90,89,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,52,51,-1,]),
		new Int32Array([61,62,64,63,-1,]),
		new Int32Array([73,86,85,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 13
	[	// blueBase-redRoof
		new Int32Array([53,56,54,55,-1,]),
		new Int32Array([65,68,66,67,-1,]),
		new Int32Array([77,89,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,50,51,-1,]),
		new Int32Array([61,64,62,63,-1,]),
		new Int32Array([73,85,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 14
	[	// blueBase-redRoof
		new Int32Array([53,54,54,55,-1,]),
		new Int32Array([65,66,68,67,-1,]),
		new Int32Array([77,89,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,51,-1,]),
		new Int32Array([61,62,64,63,-1,]),
		new Int32Array([73,85,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 15
	[	// blueBase-redRoof
		new Int32Array([53,56,55,-1,]),
		new Int32Array([65,68,67,-1,]),
		new Int32Array([77,89,80,-1,]),
		new Int32Array([77,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,51,-1,]),
		new Int32Array([61,64,63,-1,]),
		new Int32Array([73,85,76,-1,]),
		new Int32Array([73,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],

	// house 16
	[	// blueBase-redRoof
		new Int32Array([53,54,55,-1,]),
		new Int32Array([65,66,67,-1,]),
		new Int32Array([77,89,80,-1,]),
		new Int32Array([77,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,51,-1,]),
		new Int32Array([61,62,63,-1,]),
		new Int32Array([73,85,76,-1,]),
		new Int32Array([73,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],

	// house 17
	[	// blueBase-redRoof
		new Int32Array([53,54,56,55,-1,]),
		new Int32Array([65,66,66,67,-1,]),
		new Int32Array([77,91,92,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,52,51,-1,]),
		new Int32Array([61,62,62,63,-1,]),
		new Int32Array([73,87,88,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 18
	[	// blueBase-redRoof
		new Int32Array([53,54,54,56,55,-1,]),
		new Int32Array([65,68,66,68,67,-1,]),
		new Int32Array([77,89,90,89,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,52,51,-1,]),
		new Int32Array([61,64,62,64,63,-1,]),
		new Int32Array([73,85,86,85,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 19
	[	// blueBase-redRoof
		new Int32Array([53,54,54,56,55,-1,]),
		new Int32Array([65,66,66,68,67,-1,]),
		new Int32Array([77,91,92,89,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,52,51,-1,]),
		new Int32Array([61,62,62,64,63,-1,]),
		new Int32Array([73,87,88,85,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 20
	[	// blueBase-redRoof
		new Int32Array([53,56,55,-1,]),
		new Int32Array([65,68,67,-1,]),
		new Int32Array([77,89,80,-1,]),
		new Int32Array([77,78,80,-1,]),
		new Int32Array([77,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,51,-1,]),
		new Int32Array([61,64,63,-1,]),
		new Int32Array([73,85,76,-1,]),
		new Int32Array([73,74,76,-1,]),
		new Int32Array([73,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],

	// house 21
	[	// blueBase-redRoof
		new Int32Array([53,54,54,56,55,-1,]),
		new Int32Array([65,68,66,68,67,-1,]),
		new Int32Array([77,89,78,89,80,-1,]),
		new Int32Array([77,78,90,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,52,51,-1,]),
		new Int32Array([61,64,62,64,63,-1,]),
		new Int32Array([73,85,74,85,76,-1,]),
		new Int32Array([73,74,86,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 22
	[	// blueBase-redRoof
		new Int32Array([53,56,54,54,55,-1,]),
		new Int32Array([65,66,66,66,67,-1,]),
		new Int32Array([77,78,89,89,80,-1,]),
		new Int32Array([77,78,91,92,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,50,50,51,-1,]),
		new Int32Array([61,62,62,62,63,-1,]),
		new Int32Array([73,74,85,85,76,-1,]),
		new Int32Array([73,74,87,88,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 23
	[	// blueBase-redRoof
		new Int32Array([53,54,54,56,55,-1,]),
		new Int32Array([65,66,66,66,67,-1,]),
		new Int32Array([77,89,89,78,80,-1,]),
		new Int32Array([77,91,92,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,52,51,-1,]),
		new Int32Array([61,62,62,62,63,-1,]),
		new Int32Array([73,85,85,74,76,-1,]),
		new Int32Array([73,87,88,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 24
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,56,55,-1,]),
		new Int32Array([65,68,68,66,68,67,-1,]),
		new Int32Array([77,89,89,78,89,80,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,89,89,78,89,80,-1,]),
		new Int32Array([77,91,92,78,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,52,51,-1,]),
		new Int32Array([61,64,64,62,64,63,-1,]),
		new Int32Array([73,85,85,74,85,76,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,85,85,74,85,76,-1,]),
		new Int32Array([73,87,88,74,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],

	// house 25
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,54,55,-1,]),
		new Int32Array([65,66,66,66,66,67,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,78,89,78,78,80,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,78,91,92,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,50,51,-1,]),
		new Int32Array([61,62,62,62,62,63,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,74,85,74,74,76,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,74,87,88,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],

	// house 26
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,54,55,-1,]),
		new Int32Array([65,68,66,66,68,67,-1,]),
		new Int32Array([77,89,78,78,89,80,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,89,78,78,89,80,-1,]),
		new Int32Array([77,78,91,92,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,50,51,-1,]),
		new Int32Array([61,64,62,62,64,63,-1,]),
		new Int32Array([73,85,74,74,85,76,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,85,74,74,85,76,-1,]),
		new Int32Array([73,74,87,88,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],

	// house 27
	[	// blueBase-redRoof
		new Int32Array([53,54,56,54,54,55,-1,]),
		new Int32Array([65,66,66,66,66,67,-1,]),
		new Int32Array([77,78,89,78,78,80,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,78,89,78,78,80,-1,]),
		new Int32Array([77,78,90,78,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,52,50,50,51,-1,]),
		new Int32Array([61,62,62,62,62,63,-1,]),
		new Int32Array([73,74,85,74,74,76,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,74,85,74,74,76,-1,]),
		new Int32Array([73,74,86,74,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],

	// house 28
	[	// blueBase-redRoof
		new Int32Array([53,54,54,56,55,-1,]),
		new Int32Array([65,68,66,68,67,-1,]),
		new Int32Array([77,89,78,89,80,-1,]),
		new Int32Array([77,78,78,78,80,-1,]),
		new Int32Array([77,89,78,89,80,-1,]),
		new Int32Array([77,78,90,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,52,51,-1,]),
		new Int32Array([61,64,62,64,63,-1,]),
		new Int32Array([73,85,74,85,76,-1,]),
		new Int32Array([73,74,74,74,76,-1,]),
		new Int32Array([73,85,74,85,76,-1,]),
		new Int32Array([73,74,86,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 29
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,55,-1,]),
		new Int32Array([65,66,66,66,67,-1,]),
		new Int32Array([77,78,89,89,80,-1,]),
		new Int32Array([77,78,78,78,80,-1,]),
		new Int32Array([77,78,89,89,80,-1,]),
		new Int32Array([77,78,91,92,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,51,-1,]),
		new Int32Array([61,62,62,62,63,-1,]),
		new Int32Array([73,74,85,85,76,-1,]),
		new Int32Array([73,74,74,74,76,-1,]),
		new Int32Array([73,74,85,85,76,-1,]),
		new Int32Array([73,74,87,88,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 30
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,54,55,-1,]),
		new Int32Array([65,66,66,66,66,67,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,89,78,78,89,80,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,78,90,78,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,50,51,-1,]),
		new Int32Array([61,62,62,62,62,63,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,85,74,74,85,76,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,74,86,74,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],

	// house 31
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,55,-1,]),
		new Int32Array([65,66,66,66,67,-1,]),
		new Int32Array([77,89,89,78,80,-1,]),
		new Int32Array([77,78,78,78,80,-1,]),
		new Int32Array([77,89,89,78,80,-1,]),
		new Int32Array([77,91,92,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,51,-1,]),
		new Int32Array([61,62,62,62,63,-1,]),
		new Int32Array([73,85,85,74,76,-1,]),
		new Int32Array([73,74,74,74,76,-1,]),
		new Int32Array([73,85,85,74,76,-1,]),
		new Int32Array([73,87,88,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 32
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,55,-1,]),
		new Int32Array([65,66,66,66,67,-1,]),
		new Int32Array([77,78,78,89,80,-1,]),
		new Int32Array([77,78,78,78,80,-1,]),
		new Int32Array([77,78,78,89,80,-1,]),
		new Int32Array([77,90,78,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,51,-1,]),
		new Int32Array([61,62,62,62,63,-1,]),
		new Int32Array([73,74,74,85,76,-1,]),
		new Int32Array([73,74,74,74,76,-1,]),
		new Int32Array([73,74,74,85,76,-1,]),
		new Int32Array([73,86,74,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 33
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,55,-1,]),
		new Int32Array([65,66,66,66,67,-1,]),
		new Int32Array([77,89,78,78,80,-1,]),
		new Int32Array([77,78,78,78,80,-1,]),
		new Int32Array([77,89,78,78,80,-1,]),
		new Int32Array([77,78,78,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,51,-1,]),
		new Int32Array([61,62,62,62,63,-1,]),
		new Int32Array([73,85,74,74,76,-1,]),
		new Int32Array([73,74,74,74,76,-1,]),
		new Int32Array([73,85,74,74,76,-1,]),
		new Int32Array([73,74,74,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,]),
	],

	// house 34
	[	// redBase-blueRoof
		new Int32Array([49,50,52,51,-1,]),
		new Int32Array([61,64,64,63,-1,]),
		new Int32Array([73,85,85,76,-1,]),
		new Int32Array([73,74,74,76,-1,]),
		new Int32Array([73,85,85,76,-1,]),
		new Int32Array([73,87,88,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// blueBase-redRoof
		new Int32Array([53,54,56,55,-1,]),
		new Int32Array([65,68,68,67,-1,]),
		new Int32Array([77,89,89,80,-1,]),
		new Int32Array([77,78,78,80,-1,]),
		new Int32Array([77,89,89,80,-1,]),
		new Int32Array([77,91,92,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 35
	[	// blueBase-redRoof
		new Int32Array([53,54,54,55,-1,]),
		new Int32Array([65,66,68,67,-1,]),
		new Int32Array([77,78,89,80,-1,]),
		new Int32Array([77,78,78,80,-1,]),
		new Int32Array([77,78,89,80,-1,]),
		new Int32Array([77,78,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,51,-1,]),
		new Int32Array([61,62,64,63,-1,]),
		new Int32Array([73,74,85,76,-1,]),
		new Int32Array([73,74,74,76,-1,]),
		new Int32Array([73,74,85,76,-1,]),
		new Int32Array([73,74,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 36
	[	// blueBase-redRoof
		new Int32Array([53,54,54,55,-1,]),
		new Int32Array([65,68,66,67,-1,]),
		new Int32Array([77,89,78,80,-1,]),
		new Int32Array([77,78,78,80,-1,]),
		new Int32Array([77,89,78,80,-1,]),
		new Int32Array([77,90,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,51,-1,]),
		new Int32Array([61,64,62,63,-1,]),
		new Int32Array([73,85,74,76,-1,]),
		new Int32Array([73,74,74,76,-1,]),
		new Int32Array([73,85,74,76,-1,]),
		new Int32Array([73,86,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 37
	[	// blueBase-redRoof
		new Int32Array([53,54,55,-1,]),
		new Int32Array([65,68,67,-1,]),
		new Int32Array([77,89,80,-1,]),
		new Int32Array([77,78,80,-1,]),
		new Int32Array([77,89,80,-1,]),
		new Int32Array([77,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,51,-1,]),
		new Int32Array([61,64,63,-1,]),
		new Int32Array([73,85,76,-1,]),
		new Int32Array([73,74,76,-1,]),
		new Int32Array([73,85,76,-1,]),
		new Int32Array([73,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],

	// house 38
	[	// blueBase-redRoof
		new Int32Array([53,56,55,-1,]),
		new Int32Array([65,66,67,-1,]),
		new Int32Array([77,89,80,-1,]),
		new Int32Array([77,78,80,-1,]),
		new Int32Array([77,89,80,-1,]),
		new Int32Array([77,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,51,-1,]),
		new Int32Array([61,62,63,-1,]),
		new Int32Array([73,85,76,-1,]),
		new Int32Array([73,74,76,-1,]),
		new Int32Array([73,85,76,-1,]),
		new Int32Array([73,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,]),
	],

	// house 39
	[	// blueBase-redRoof
		new Int32Array([53,56,54,55,-1,]),
		new Int32Array([65,66,66,67,-1,]),
		new Int32Array([77,89,78,80,-1,]),
		new Int32Array([77,78,78,80,-1,]),
		new Int32Array([77,89,90,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,52,50,51,-1,]),
		new Int32Array([61,62,62,63,-1,]),
		new Int32Array([73,85,74,76,-1,]),
		new Int32Array([73,74,74,76,-1,]),
		new Int32Array([73,85,86,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 40
	[	// blueBase-redRoof
		new Int32Array([53,54,56,55,-1,]),
		new Int32Array([65,66,66,67,-1,]),
		new Int32Array([77,78,89,80,-1,]),
		new Int32Array([77,78,78,80,-1,]),
		new Int32Array([77,90,89,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,52,51,-1,]),
		new Int32Array([61,62,62,63,-1,]),
		new Int32Array([73,74,85,76,-1,]),
		new Int32Array([73,74,74,76,-1,]),
		new Int32Array([73,86,85,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,]),
	],

	// house 41
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,56,55,-1,]),
		new Int32Array([65,66,66,66,66,67,-1,]),
		new Int32Array([77,89,78,78,89,80,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,78,91,92,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,52,51,-1,]),
		new Int32Array([61,62,62,62,62,63,-1,]),
		new Int32Array([73,85,74,74,85,76,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,74,87,88,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],

	// house 42
	[	// blueBase-redRoof
		new Int32Array([53,54,54,54,54,55,-1,]),
		new Int32Array([65,66,66,66,66,67,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,78,78,78,78,80,-1,]),
		new Int32Array([77,78,91,92,78,80,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],
	[	// redBase-blueRoof
		new Int32Array([49,50,50,50,50,51,-1,]),
		new Int32Array([61,62,62,62,62,63,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,74,74,74,74,76,-1,]),
		new Int32Array([73,74,87,88,74,76,-1,]),
		new Int32Array([-1,-1,-1,-1,-1,-1,-1,]),
	],
];
export default HOUSES;

/*
  Super basic houses for debugging if needed
  [
    new Int32Array([
      new Int32Array([49, 50, 50, 50, 50, 51,  0,]),
      new Int32Array([61, 62, 62, 62, 62, 63,  0,]),
      new Int32Array([73, 74, 74, 74, 74, 76,  0,]),
      new Int32Array([73, 74, 74, 74, 74, 76,  0,]),
      new Int32Array([73, 74, 74, 74, 74, 76,  0,]),
      new Int32Array([73, 74, 74, 74, 74, 76,  0,]),
      new Int32Array([ 0,  0,  0,  0,  0,  0,  0,]),
    ],
    new Int32Array([
      new Int32Array([53, 54, 54, 54, 54, 55,  0,]),
      new Int32Array([65, 66, 66, 66, 66, 67,  0,]),
      new Int32Array([77, 78, 78, 78, 78, 80,  0,]),
      new Int32Array([77, 78, 78, 78, 78, 80,  0,]),
      new Int32Array([77, 78, 78, 78, 78, 80,  0,]),
      new Int32Array([77, 78, 78, 78, 78, 80,  0,]),
      new Int32Array([ 0,  0,  0,  0,  0,  0,  0,]),
    ],
  ];
*/