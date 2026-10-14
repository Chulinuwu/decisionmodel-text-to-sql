def to_answer(question, probabilities):
    if question.type == "noul":
        return {"type": "noul", "noul": probabilities[1]}
    names = list(question.criteria)
    best = max(range(len(probabilities)), key=probabilities.__getitem__)
    return {"type": "choice", "choice": names[best], "confidence": probabilities[best],
            "probabilities": dict(zip(names, probabilities))}
