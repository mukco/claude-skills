# Ruby Enumerable Reference

`Enumerable` is Ruby's most powerful module. Include it in any collection class by implementing `each`, and you get ~60 methods for free. This reference covers the full API, lazy enumeration, and implementing custom enumerables.

## Core Methods

### Transformation

```ruby
# map / collect — transform each element, return new array
[1, 2, 3].map { |n| n * 2 }             # => [2, 4, 6]
["a", "b"].map(&:upcase)                 # => ["A", "B"]

# flat_map — map then flatten one level
[[1, 2], [3, 4]].flat_map { |a| a }     # => [1, 2, 3, 4]
users.flat_map(&:tags)                   # flatten tags across all users

# zip — interleave two (or more) arrays
[1, 2, 3].zip([4, 5, 6])                # => [[1,4],[2,5],[3,6]]
[1, 2, 3].zip([4, 5, 6], [7, 8, 9])    # => [[1,4,7],[2,5,8],[3,6,9]]

# each_with_object — build a result object
users.each_with_object({}) do |user, hash|
  hash[user.id] = user.name
end
# => { 1 => "Alice", 2 => "Bob", ... }

# inject / reduce — fold to single value
[1, 2, 3, 4].inject(:+)                 # => 10
[1, 2, 3, 4].inject(10, :+)             # => 20 (initial value)
[1, 2, 3, 4].reduce { |sum, n| sum + n } # => 10
```

### Filtering

```ruby
# select / filter — keep matching
[1, 2, 3, 4, 5].select(&:odd?)          # => [1, 3, 5]
users.select { |u| u.admin? }

# reject — remove matching
[1, 2, 3, 4, 5].reject(&:even?)         # => [1, 3, 5]

# filter_map — select + map in one pass (Ruby 2.7+)
users.filter_map { |u| u.email if u.active? }
# equivalent to: users.select(&:active?).map(&:email) — but faster

# partition — split into [matches, non-matches]
evens, odds = [1, 2, 3, 4, 5].partition(&:even?)
# evens => [2, 4], odds => [1, 3, 5]

# group_by — group into hash of arrays
users.group_by(&:role)
# => { "admin" => [...], "user" => [...] }
```

### Finding

```ruby
# find / detect — first match or nil
users.find { |u| u.email == "alice@example.com" }

# find_index — index of first match
[10, 20, 30].find_index { |n| n > 15 }  # => 1

# first, last
users.first        # first element
users.first(3)     # first 3 elements as array

# min, max
[3, 1, 4, 1, 5].min   # => 1
[3, 1, 4, 1, 5].max   # => 5
[3, 1, 4, 1, 5].minmax  # => [1, 5]

# min_by, max_by, minmax_by
users.min_by(&:created_at)
users.max_by { |u| u.orders.count }
users.minmax_by(&:score)             # => [lowest, highest]

# sort, sort_by
["banana", "apple", "cherry"].sort   # alphabetical
users.sort_by(&:name)                # stable sort
users.sort_by { |u| [-u.score, u.name] }  # descending score, alpha name
```

### Aggregation

```ruby
count  = users.count                  # total count
count  = users.count(&:active?)       # conditional count
total  = orders.sum(&:amount)         # sum attribute
total  = orders.sum { |o| o.amount * o.quantity }

avg    = scores.sum.to_f / scores.size  # no built-in mean — calculate manually
```

### Existence Checks

```ruby
users.any?(&:admin?)          # at least one admin?
users.all?(&:active?)         # all active?
users.none?(&:banned?)        # no banned?
users.one? { |u| u.superuser? }  # exactly one?
users.include?(target_user)   # element present?
users.member?(target_user)    # alias for include?
```

### Grouping and Slicing

```ruby
# tally — count occurrences (Ruby 2.7+)
["a", "b", "a", "c", "b", "a"].tally
# => { "a" => 3, "b" => 2, "c" => 1 }

# chunk — group consecutive elements by key
[1, 1, 2, 2, 3, 1, 1].chunk { |n| n }.map { |key, arr| [key, arr.size] }
# => [[1, 2], [2, 2], [3, 1], [1, 2]]

# chunk_while — group while condition holds
[1, 2, 3, 7, 8, 9].chunk_while { |a, b| b == a + 1 }.to_a
# => [[1, 2, 3], [7, 8, 9]]

# slice_when — cut when condition is true (inverse of chunk_while)
[1, 2, 3, 7, 8, 9].slice_when { |a, b| b != a + 1 }.to_a
# => [[1, 2, 3], [7, 8, 9]]

# each_slice — yield arrays of n elements
(1..10).each_slice(3).to_a
# => [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]

# each_cons — sliding window of n consecutive elements
(1..5).each_cons(3).to_a
# => [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
```

### Flattening

```ruby
[[1, [2]], [3]].flatten         # => [1, 2, 3] (all levels)
[[1, [2]], [3]].flatten(1)      # => [1, [2], 3] (one level)
users.flat_map(&:addresses)     # map + flatten one level
```

---

## Sorting

### sort vs sort_by

Prefer `sort_by` over `sort` with a block when extracting a key — it's faster (Schwartzian transform).

```ruby
# sort — calls <=> on each comparison (O(n log n) comparisons)
users.sort { |a, b| a.name <=> b.name }

# sort_by — extracts key once per element, then sorts keys (O(n) + O(n log n))
users.sort_by(&:name)

# Multi-key sort
users.sort_by { |u| [u.role, u.name] }

# Descending — negate numeric keys
scores.sort_by { |s| -s.value }

# Stable sort (Ruby's sort is not stable, sort_by is)
users.sort_by.with_index { |u, i| [u.name, i] }
```

---

## Lazy Enumerators

Lazy evaluation defers computation until values are consumed. Essential for:
- Infinite sequences
- Short-circuiting expensive pipelines
- Processing large datasets without building intermediate arrays

```ruby
# Without lazy — builds all intermediate arrays
(1..Float::INFINITY).select(&:even?).first(5)  # runs forever!

# With lazy — stops as soon as 5 results are found
(1..Float::INFINITY).lazy.select(&:even?).first(5)
# => [2, 4, 6, 8, 10]

# Lazy pipeline
result = (1..Float::INFINITY)
  .lazy
  .select { |n| n % 3 == 0 }
  .map    { |n| n ** 2 }
  .reject { |n| n % 2 == 0 }
  .first(4)
# => [9, 225, 441, 729]

# Force evaluation of lazy enumerator
lazy_result = users.lazy.select(&:active?).map(&:name)
lazy_result.to_a    # forces full evaluation
lazy_result.first   # evaluates only until first match
```

### Custom Infinite Sequence

```ruby
fib = Enumerator.new do |yielder|
  a, b = 0, 1
  loop do
    yielder << a
    a, b = b, a + b
  end
end

fib.lazy.select { |n| n.even? }.first(5)
# => [0, 2, 8, 34, 144]
```

---

## Implementing Enumerable in Custom Classes

```ruby
class Playlist
  include Enumerable
  include Comparable

  attr_reader :name, :tracks

  def initialize(name)
    @name   = name
    @tracks = []
  end

  def add(track)
    @tracks << track
    self
  end

  # Required for Enumerable
  def each(&block)
    @tracks.each(&block)
  end

  # Required for Comparable (compare by track count)
  def <=>(other)
    tracks.size <=> other.tracks.size
  end
end

playlist = Playlist.new("Workout").add(track1).add(track2).add(track3)

playlist.map(&:title)          # Enumerable
playlist.select(&:explicit?)   # Enumerable
playlist.sort_by(&:duration)   # Enumerable
playlist.min_by(&:bpm)         # Enumerable (Comparable on elements)
```

### Delegation Pattern

When wrapping a collection, delegate `each` to avoid re-implementing everything:

```ruby
require "forwardable"

class UserCollection
  include Enumerable
  extend Forwardable

  def_delegators :@users, :each, :size, :empty?

  def initialize(users = [])
    @users = users
  end

  def active = self.class.new(select(&:active?))
  def admins = self.class.new(select(&:admin?))
end

users = UserCollection.new(User.all)
users.active.admins.map(&:email)
```

---

## Enumerable Anti-Patterns

### each + array building

```ruby
# WRONG — manual accumulation
result = []
users.each { |u| result << u.name if u.active? }

# RIGHT
result = users.filter_map { |u| u.name if u.active? }
# or
result = users.select(&:active?).map(&:name)
```

### map + flatten

```ruby
# WRONG — two passes
users.map(&:tags).flatten

# RIGHT — one pass
users.flat_map(&:tags)
```

### any? / all? with count

```ruby
# WRONG — counts all, even after finding one
users.count(&:admin?) > 0

# RIGHT — stops at first match
users.any?(&:admin?)
```

### Chaining select after each

```ruby
# WRONG — doesn't filter
users.each.select(&:active?)  # each returns original array unfiltered

# RIGHT
users.select(&:active?)
```

### Ignoring filter_map

```ruby
# WRONG — two-step (Ruby < 2.7 style)
users.select(&:active?).map(&:email)

# RIGHT — one step (Ruby 2.7+)
users.filter_map { |u| u.email if u.active? }
```
