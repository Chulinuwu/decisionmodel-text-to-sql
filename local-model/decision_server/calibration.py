def temperature_key(question):
    count = question.options
    return f"{question.type}:" + ("2" if count <= 2 else "3-5" if count <= 5 else "6-10" if count <= 10 else "11+")


def probabilities(logits, question, temperatures):
    if temperatures is not None:
        logits = logits / temperatures.get(temperature_key(question), temperatures.get(question.type, 1.0))
    return logits.softmax(-1).tolist()
