/** Profiles the performances of functions. */
export default class PerformanceProfiler {
	/** @type {Map<string, { totalExecutionTime: number, timesCalled: number, isInnerFunctionCall: boolean }>} */
	data = new Map();

	/**
	 * Registers a function to have its performance data recorded each time it's called. Returns the function back.
	 * @param {Function} func The function to be registered.
	 * @param {boolean} isInnerFunctionCall Whether the function should contribute to the combined total execution time or not.
	 * @returns {Function} The registered version of func().
	 */
	register(func, isInnerFunctionCall) {
		if (!func.name) throw new Error("The function cannot be anonymous (nameless)");
		if (func.originalVersion) return func;	// prevent double-wrapping

		const profiler = this;

		/**
		 * A wrapped version of func() that executes like normal but now additionally lets the profiler record its performance data.
		 * @template T The return type of func().
		 * @param {...any} args The arguments to be passed to func(). Can be any amount of arguments.
		 * @returns {T} Whatever func() returns.
		 */
		function func_Registered(...args) {
			const start = performance.now();
			const result = func.apply(this, args);	// execute func() with the same this context as its caller
			const duration = performance.now() - start;
		
			if (profiler.data.has(func.name)) {
				profiler.data.get(func.name).totalExecutionTime += duration;
				profiler.data.get(func.name).timesCalled++;
			} else {
				profiler.data.set(func.name, {
					totalExecutionTime: duration,
					timesCalled: 1,
					isInnerFunctionCall: isInnerFunctionCall
				});
			}
	
			return result;
		}
	
		func_Registered.originalVersion = func; // for unwrapping
		return func_Registered;
	}

	/**
	 * Unregisters a function from having its performance data recorded each time it's called.
	 * @param {Function} func The function to be unregistered.
	 * @returns {Function} The unregistered (original) version of func().
	 */
	unregister(func) {
		return func.originalVersion ?? func;	// only unwrap if func is wrapped
	}

	/** Console logs the performance data of all functions profiled. */
	logData() {
		let message = "";
		let combinedTotalExecutionTime = 0;

		for (const [funcName, funcData] of this.data) {
			message += `${funcName}():\n`;
			message += `\tTotal Duration: ${funcData.totalExecutionTime.toFixed(2)} ms\n`;
			message += `\tAverage Duration: ${(funcData.totalExecutionTime / funcData.timesCalled).toFixed(2)} ms\n`
			message += `\tNum Calls: ${funcData.timesCalled}\n`;
			if (!funcData.isInnerFunctionCall) combinedTotalExecutionTime += funcData.totalExecutionTime;
		}
		message += `\nCombined Total Duration: ${combinedTotalExecutionTime.toFixed(2)} ms`;

		console.log(message);
	}

	/** Clears all tracked performance data. */
	clearData() {
		this.data.clear();
	}
}