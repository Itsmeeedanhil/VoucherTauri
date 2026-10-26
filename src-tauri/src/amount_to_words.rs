const ONES: [&str; 20] = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
];

const TENS: [&str; 10] = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

const THOUSANDS: [&str; 5] = ["", "Thousand", "Million", "Billion", "Trillion"];

fn convert_chunk(mut n: u64) -> String {
    let mut parts = Vec::new();

    if n >= 100 {
        let h = (n / 100) as usize;
        parts.push(format!("{} Hundred", ONES[h]));
        n %= 100;
    }

    if n >= 20 {
        let t = (n / 10) as usize;
        let o = (n % 10) as usize;
        if o > 0 {
            parts.push(format!("{}-{}", TENS[t], ONES[o]));
        } else {
            parts.push(TENS[t].to_string());
        }
    } else if n > 0 {
        parts.push(ONES[n as usize].to_string());
    }

    parts.join(" ")
}

pub fn amount_to_words_php(amount: f64) -> String {
    let abs_amount = amount.abs();
    let whole = abs_amount.floor() as u64;
    let cents = ((abs_amount - (whole as f64)) * 100.0).round() as u64;

    let (whole, cents) = if cents >= 100 {
        (whole + 1, cents - 100)
    } else {
        (whole, cents)
    };

    if whole == 0 && cents == 0 {
        return "Zero Pesos Only".to_string();
    }

    let mut words = Vec::new();
    let mut rem = whole;
    let mut group_idx = 0;

    while rem > 0 && group_idx < THOUSANDS.len() {
        let chunk = rem % 1000;
        if chunk > 0 {
            let chunk_str = convert_chunk(chunk);
            let scale = THOUSANDS[group_idx];
            if scale.is_empty() {
                words.push(chunk_str);
            } else {
                words.push(format!("{} {}", chunk_str, scale));
            }
        }
        rem /= 1000;
        group_idx += 1;
    }

    words.reverse();
    let whole_words = if words.is_empty() {
        "Zero".to_string()
    } else {
        words.join(" ")
    };

    if cents > 0 {
        format!("{} and {:02}/100 Pesos Only", whole_words, cents)
    } else {
        format!("{} Pesos Only", whole_words)
    }
}

